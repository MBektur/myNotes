import { parseCsvRows } from "./csv"
import { todayStr } from "./filters"
import { NOTE_COLORS, type NoteColor } from "./types"
import { ug } from "./ug"
import type { Lesson, Person, Slot } from "./schedule-data"

export type ScheduleData = { people: Person[]; lessons: Lesson[] }

// Bir CSV ichide ikki türlük qur: type = person | lesson
//  Kün: 0 yaki 7 = yekshenbe (pazar), 1 = düshenbe … 6 = shenbe
//  flexible: 1 bolsa ders waqti éniq emes (özgirishi mumkin)
//  note: erkin izah (ders kodi, sinipxana ...)
//  person: id, name, color, avail, travel (yol waqti, minut)      avail  = "1 09:00-13:00;1 15:00-19:00;2 09:00-13:00"  (kün waqit-waqit)
//  lesson: id, personId, day, start, end, subject, from, to, exclude      exclude = "2026-11-09;2026-12-28"
const COLUMNS = ["type", "id", "name", "color", "avail", "personId", "day", "start", "end", "subject", "from", "to", "exclude", "flexible", "note", "travel"] as const

const esc = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
/** Yol waqti (minut): 0–240 arisidiki pütün san, bolmisa undefined */
const parseTravel = (v: string) => (/^\d{1,3}$/.test(v) && Number(v) <= 240 ? Number(v) : undefined)
const split = (v: string) => v.split(";").map((x) => x.trim()).filter(Boolean)

export function scheduleToCsv({ people, lessons }: ScheduleData) {
  const rows: string[][] = [
    ...people.map((p) => {
      const avail = Object.entries(p.avail)
        .flatMap(([d, slots]) => (slots ?? []).map((s) => `${d} ${s.start}-${s.end}`))
        .join(";")
      return ["person", p.id, p.name, p.color, avail, "", "", "", "", "", "", "", "", "", p.travelMin != null ? String(p.travelMin) : ""]
    }),
    ...lessons.map((l) => [
      "lesson", l.id, "", "", "", l.personId, String(l.day), l.start, l.end, l.subject, l.from, l.to, (l.exclude ?? []).join(";"), l.flexible ? "1" : "", l.note ?? "",
    ]),
  ]
  return "﻿" + [COLUMNS.join(","), ...rows.map((r) => [...r, ...Array<string>(Math.max(0, COLUMNS.length - r.length)).fill("")].map(esc).join(","))].join("\r\n")
}

export function exportScheduleCsv(data: ScheduleData) {
  const blob = new Blob([scheduleToCsv(data)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `schedule-${todayStr()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Yaramsiz qurlar ötküzüwétilidu; `skipped` ularning sani. Héchqandaq kishi bolmisa null. */
export function parseScheduleCsv(text: string): (ScheduleData & { skipped: number }) | null {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return null
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => head.indexOf(name.toLowerCase())
  if (col("type") < 0) return null
  const get = (r: string[], name: string) => (col(name) >= 0 ? (r[col(name)] ?? "").trim() : "")

  const people: Person[] = []
  const lessons: Lesson[] = []
  let skipped = 0

  for (const r of rows.slice(1)) {
    const type = get(r, "type").toLowerCase()
    if (type === "person") {
      const id = get(r, "id")
      const name = ug(get(r, "name"))
      if (!id || !name || people.some((p) => p.id === id)) { skipped++; continue }
      const color = get(r, "color") as NoteColor
      const avail: Person["avail"] = {}
      let bad = false
      for (const part of split(get(r, "avail"))) {
        const m = part.match(/^([0-7])\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
        if (!m || !TIME.test(m[2]) || !TIME.test(m[3]) || m[2] >= m[3]) { bad = true; break }
        const slot: Slot = { start: m[2], end: m[3] }
        ;(avail[Number(m[1]) % 7] ??= []).push(slot)
      }
      if (bad) { skipped++; continue }
      people.push({
        id, name, avail, travelMin: parseTravel(get(r, "travel")),
        color: (NOTE_COLORS as readonly string[]).includes(color) ? color : NOTE_COLORS[people.length % NOTE_COLORS.length],
      })
    } else if (type === "lesson") {
      const day = get(r, "day")
      const l: Lesson = {
        id: get(r, "id") || `l${lessons.length + 1}`,
        personId: get(r, "personId"),
        day: Number(day) % 7, // 7 = yekshenbe (pazar), 0 bilen oxshash
        start: get(r, "start"),
        end: get(r, "end"),
        subject: ug(get(r, "subject")),
        from: get(r, "from"),
        to: get(r, "to"),
        exclude: split(get(r, "exclude")),
        flexible: /^(1|true|yes|x)$/i.test(get(r, "flexible")) || undefined,
        note: get(r, "note") || undefined,
      }
      const ok =
        /^[0-7]$/.test(day) && TIME.test(l.start) && TIME.test(l.end) && l.start < l.end &&
        DATE.test(l.from) && DATE.test(l.to) && l.from <= l.to && !!l.subject &&
        l.exclude!.every((d) => DATE.test(d))
      if (!ok) { skipped++; continue }
      // Birdek (kishi+kün+waqit+ders) tekrar qurlar bir dane qilinidu
      const dup = lessons.some(
        (x) => x.personId === l.personId && x.day === l.day && x.start === l.start && x.end === l.end && x.subject === l.subject
      )
      if (dup) continue
      lessons.push(l)
    } else skipped++
  }

  if (people.length === 0) return null
  // Namelum kishige baghlanghan dersler chiqirip tashlinidu
  const valid = lessons.filter((l) => people.some((p) => p.id === l.personId))
  skipped += lessons.length - valid.length
  return { people, lessons: valid, skipped }
}
