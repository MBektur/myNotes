import { supabase } from "./supabase/client"
import type { ScheduleData } from "./schedule-csv"
import type { Lesson, Person } from "./schedule-data"

/* eslint-disable @typescript-eslint/no-explicit-any */
const personFromRow = (r: any): Person => ({
  id: r.id,
  name: r.name,
  color: r.color,
  avail: r.avail ?? {},
  travelMin: r.travel_min ?? undefined,
})
const personToRow = (p: Person) => ({
  id: p.id,
  name: p.name,
  color: p.color,
  avail: p.avail ?? {},
  travel_min: p.travelMin ?? null,
})
const lessonFromRow = (r: any): Lesson => ({
  id: r.id,
  personId: r.person_id,
  day: r.day,
  start: r.start_t,
  end: r.end_t,
  subject: r.subject,
  from: r.from_d,
  to: r.to_d,
  exclude: r.exclude?.length ? r.exclude : undefined,
  flexible: r.flexible || undefined,
  note: r.note ?? undefined,
})
const lessonToRow = (l: Lesson) => ({
  id: l.id,
  person_id: l.personId,
  day: l.day,
  start_t: l.start,
  end_t: l.end,
  subject: l.subject,
  from_d: l.from,
  to_d: l.to,
  exclude: l.exclude ?? [],
  flexible: l.flexible ?? false,
  note: l.note ?? null,
})

const CHUNK = 100
const chunks = <T,>(a: T[]) =>
  Array.from({ length: Math.ceil(a.length / CHUNK) }, (_, i) => a.slice(i * CHUNK, (i + 1) * CHUNK))

export async function fetchSchedule(): Promise<ScheduleData | null> {
  const [p, l] = await Promise.all([
    supabase().from("schedule_people").select("*"),
    supabase().from("schedule_lessons").select("*"),
  ])
  if (p.error) throw p.error
  if (l.error) throw l.error
  if (!p.data.length && !l.data.length) return null
  return { people: p.data.map(personFromRow), lessons: l.data.map(lessonFromRow) }
}

type Row = { id: string }

/** Yalghuz özgergen satirlarni yollaydu, öchürülgenlirini öchüridu (aldin sinxronlanghan holetke nisbeten). */
async function diffTable(table: string, rows: Row[], prev: Row[]) {
  const db = supabase()
  const before = new Map(prev.map((r) => [r.id, JSON.stringify(r)]))
  const keep = new Set(rows.map((r) => r.id))
  const changed = rows.filter((r) => before.get(r.id) !== JSON.stringify(r))
  const stale = prev.map((r) => r.id).filter((id) => !keep.has(id))
  await Promise.all(
    chunks(changed).map(async (c) => {
      const { error } = await db.from(table).upsert(c)
      if (error) throw error
    })
  )
  return async () => {
    await Promise.all(
      chunks(stale).map(async (c) => {
        const { error } = await db.from(table).delete().in("id", c)
        if (error) throw error
      })
    )
  }
}

async function replaceTable(table: string, rows: Row[]) {
  const existing = await supabase().from(table).select("id")
  if (existing.error) throw existing.error
  const flush = await diffTable(table, rows, existing.data as Row[])
  await flush()
}

const toRows = (d: ScheduleData) => ({ people: d.people.map(personToRow), lessons: d.lessons.map(lessonToRow) })

/** Uzaktaki programni berilgen melumat bilen teng qilidu. `prev` bolsa peqet perqni yollaydu (tézrek). */
export async function pushSchedule(data: ScheduleData, prev?: ScheduleData | null) {
  const next = toRows(data)
  if (!prev) {
    await replaceTable("schedule_people", next.people)
    await replaceTable("schedule_lessons", next.lessons)
    return
  }
  const old = toRows(prev)
  const flushPeople = await diffTable("schedule_people", next.people, old.people)
  const flushLessons = await diffTable("schedule_lessons", next.lessons, old.lessons)
  await Promise.all([flushLessons(), flushPeople()])
}

export const clearRemoteSchedule = () => pushSchedule({ people: [], lessons: [] })
