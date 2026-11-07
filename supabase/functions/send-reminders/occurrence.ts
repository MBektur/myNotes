// Nota xas hatirlatma (alarm): saf fonksiyonlar, import yoq.
// Edge Function (Deno) we istemci (Next) ikkilisi ishlitidu; shunga bu höjjet hichnersini import qilmisun.
// Test: node --test supabase/functions/send-reminders/occurrence.test.ts
//
// Waqitlar "yerlik tam saet" (wall clock) minuti bilen hésablinidu: "yyyy-MM-ddTHH:mm" -> Date.UTC/60000.
// DST almashqanda bir saetlik siljish qobul qilinidu.

export type ReminderUnit = "minute" | "hour" | "day" | "week" | "month"
export type ReminderRepeat = { every: number; unit: ReminderUnit }
/** at: yerlik waqit "yyyy-MM-ddTHH:mm" (kullanghuchining saet dilimida) */
export type ReminderRule = { id: string; at: string; repeat?: ReminderRepeat }

export const REMINDER_UNITS: readonly ReminderUnit[] = ["minute", "hour", "day", "week", "month"]
export const MAX_REMINDERS = 10
export const MAX_EVERY = 999

const DAY = 24 * 60
const UNIT_MIN: Record<ReminderUnit, number> = { minute: 1, hour: 60, day: DAY, week: 7 * DAY, month: 28 * DAY }

/** Berilgen tz'dike yerlik sene-ay-kün ("yyyy-MM-dd") we kün ichidiki minut. */
export function localParts(now: Date, tz: string): { date: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now)
  } catch {
    return localParts(now, "UTC") // yaramsiz tz
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) }
}

/** "yyyy-MM-ddTHH:mm" -> wall-clock minut; yaramsiz bolsa null */
export function toMin(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  return Date.UTC(y, mo - 1, d, h, mi) / 60000
}

export function fromMin(min: number): string {
  return new Date(min * 60000).toISOString().slice(0, 16)
}

/** tz'diki hazirqi yerlik waqit (wall-clock minut) */
export function localNowMin(now: Date, tz: string): number {
  const { date, minutes } = localParts(now, tz)
  return (toMin(`${date}T00:00`) ?? 0) + minutes
}

function cleanRepeat(r: unknown): ReminderRepeat | undefined {
  if (!r || typeof r !== "object") return undefined
  const { every, unit } = r as { every?: unknown; unit?: unknown }
  if (typeof every !== "number" || !Number.isInteger(every) || every < 1 || every > MAX_EVERY) return undefined
  if (!REMINDER_UNITS.includes(unit as ReminderUnit)) return undefined
  return { every, unit: unit as ReminderUnit }
}

/** DB'din kelgen jsonb'ni tekshürüp tazilaydu (yaramsizlirini tashlaydu). */
export function parseReminders(raw: unknown): ReminderRule[] {
  if (!Array.isArray(raw)) return []
  const out: ReminderRule[] = []
  for (const r of raw) {
    if (!r || typeof r !== "object") continue
    const { id, at, repeat } = r as { id?: unknown; at?: unknown; repeat?: unknown }
    if (typeof id !== "string" || !id || typeof at !== "string" || toMin(at) === null) continue
    const rep = cleanRepeat(repeat)
    out.push(rep ? { id, at, repeat: rep } : { id, at })
    if (out.length >= MAX_REMINDERS) break
  }
  return out
}

/** k-qétimliq tekrar (k = 0 -> at). Ay: kün ay axirigha qisqartilidu (31 -> 30/28), lékin eslidiki kün saqlinidu. */
function nth(atMin: number, rep: ReminderRepeat, k: number): number {
  if (rep.unit !== "month") return atMin + k * rep.every * UNIT_MIN[rep.unit]
  const a = new Date(atMin * 60000)
  const month = a.getUTCMonth() + k * rep.every
  const last = new Date(Date.UTC(a.getUTCFullYear(), month + 1, 0)).getUTCDate()
  return Date.UTC(a.getUTCFullYear(), month, Math.min(a.getUTCDate(), last), a.getUTCHours(), a.getUTCMinutes()) / 60000
}

/** nth(k) <= now bolghan eng chong k (now >= at dep perez qilinidu) */
function lastIndex(atMin: number, rep: ReminderRepeat, nowMin: number): number {
  if (rep.unit !== "month") return Math.floor((nowMin - atMin) / (rep.every * UNIT_MIN[rep.unit]))
  const a = new Date(atMin * 60000)
  const n = new Date(nowMin * 60000)
  const diff = (n.getUTCFullYear() - a.getUTCFullYear()) * 12 + (n.getUTCMonth() - a.getUTCMonth())
  let k = Math.floor(diff / rep.every)
  if (nth(atMin, rep, k) > nowMin) k--
  return Math.max(k, 0)
}

/** now'din kéyin bolmighan eng axirqi qétim (wall-clock minut); téxi bashlanmighan bolsa null */
export function lastOccurrence(r: ReminderRule, nowMin: number): number | null {
  const atMin = toMin(r.at)
  if (atMin === null || nowMin < atMin) return null
  return r.repeat ? nth(atMin, r.repeat, lastIndex(atMin, r.repeat, nowMin)) : atMin
}

/** now'din kéyinki (yaki del now) qétim; tekrarsiz we ötüp ketken bolsa null */
export function nextOccurrence(r: ReminderRule, nowMin: number): number | null {
  const atMin = toMin(r.at)
  if (atMin === null) return null
  if (nowMin <= atMin) return atMin
  if (!r.repeat) return null
  const k = lastIndex(atMin, r.repeat, nowMin)
  const cur = nth(atMin, r.repeat, k)
  return cur === nowMin ? cur : nth(atMin, r.repeat, k + 1)
}

/**
 * Bir qétimni qanche waqit ichide yollasa bolidu (minut): cron ötküzüwetse tutup alidu,
 * lékin köp kéyin yaki kéyinki tekrar bilen qoshulup kétip yaghdurmaydu.
 */
export function dueWindow(r: ReminderRule): number {
  return r.repeat ? Math.min(DAY, r.repeat.every * UNIT_MIN[r.repeat.unit]) : DAY
}

export type NoteDue = { noteId: string; reminderId: string; fireAt: string }

/** Hazir yollinishi kérek bolghan nota hatirlatmiliri (log'ni hésapqa almaydu). */
export function computeNoteDue(notes: { id: string; reminders: unknown }[], tz: string, now: Date): NoteDue[] {
  const nowMin = localNowMin(now, tz)
  const out: NoteDue[] = []
  for (const n of notes) {
    for (const r of parseReminders(n.reminders)) {
      const occ = lastOccurrence(r, nowMin)
      if (occ !== null && nowMin - occ < dueWindow(r)) out.push({ noteId: n.id, reminderId: r.id, fireAt: fromMin(occ) })
    }
  }
  return out
}
