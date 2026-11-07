// Son kün hatirlatma mantighi: saf fonksiyonlar (Deno'da da Node'da da ishleydu; I/O yoq).
// Test: node --test supabase/functions/send-reminders/due.test.ts

export type ReminderNote = { id: string; title: string | null; deadline: string } // deadline: "yyyy-MM-dd"
export type ReminderSettings = { offsets: number[]; sendTime: string; tz: string } // sendTime: "HH:MM"
/** offset: 0 = son kün, N = N kün burun, -1 = mudditi ötüp ketti */
export type Due = { noteId: string; deadline: string; offset: number }

export const OVERDUE = -1

import { localParts } from "./occurrence.ts"
export { localParts }

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function parseTime(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9 * 60
}

/**
 * Hatirlatma "scheduled" kün + sendTime waqtida pishidu. U waqit hazirdin kéyin emes,
 * we 24 saettin éship ketmigen bolsa "due" (cron bir qétim ötküzüwetken bolsimu tutup alidu, lékin köp kün kéyin yaghdurmaydu).
 */
function isDue(scheduledDate: string, sendMin: number, today: string, nowMin: number): boolean {
  if (scheduledDate === today) return nowMin >= sendMin
  if (addDays(scheduledDate, 1) === today) return nowMin < sendMin // 24 saet ichide
  return false
}

/** Bir kullanghuchining notliri üchün hazir yollinishi kérek bolghan hatirlatmilar (log'ni hésapqa almaydu). */
export function computeDue(notes: ReminderNote[], s: ReminderSettings, now: Date): Due[] {
  const { date: today, minutes: nowMin } = localParts(now, s.tz)
  const sendMin = parseTime(s.sendTime)
  const offsets = [...new Set(s.offsets.filter((o) => Number.isInteger(o) && o >= 0))]
  const out: Due[] = []
  for (const n of notes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.deadline)) continue
    for (const o of offsets) {
      if (isDue(addDays(n.deadline, -o), sendMin, today, nowMin)) out.push({ noteId: n.id, deadline: n.deadline, offset: o })
    }
    // Mudditi ötken: ikkinji künide bir qétim
    if (isDue(addDays(n.deadline, 1), sendMin, today, nowMin)) out.push({ noteId: n.id, deadline: n.deadline, offset: OVERDUE })
  }
  return out
}

/** Log'da barlirini chiqirip tashlaydu. key = `${noteId}|${deadline}|${offset}` */
export function dropLogged(due: Due[], logged: Set<string>): Due[] {
  return due.filter((d) => !logged.has(`${d.noteId}|${d.deadline}|${d.offset}`))
}

/** Bir xatire üchün eng shoshunchluq (eng kichik, OVERDUE eng aldida) offset. */
export function mostUrgent(due: Due[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const d of due) {
    const cur = m.get(d.noteId)
    if (cur === undefined || d.offset === OVERDUE || (cur !== OVERDUE && d.offset < cur)) m.set(d.noteId, d.offset)
  }
  return m
}
