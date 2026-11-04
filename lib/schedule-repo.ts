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

async function replaceTable(table: string, rows: { id: string }[]) {
  const db = supabase()
  const existing = await db.from(table).select("id")
  if (existing.error) throw existing.error
  const keep = new Set(rows.map((r) => r.id))
  const stale = existing.data.map((r: { id: string }) => r.id).filter((id) => !keep.has(id))
  for (const c of chunks(rows)) {
    const { error } = await db.from(table).upsert(c)
    if (error) throw error
  }
  for (const c of chunks(stale)) {
    const { error } = await db.from(table).delete().in("id", c)
    if (error) throw error
  }
}

/** Uzaktaki programı verilen veriyle birebir eşitler. */
export async function pushSchedule(data: ScheduleData) {
  await replaceTable("schedule_people", data.people.map(personToRow))
  await replaceTable("schedule_lessons", data.lessons.map(lessonToRow))
}

export const clearRemoteSchedule = () => pushSchedule({ people: [], lessons: [] })
