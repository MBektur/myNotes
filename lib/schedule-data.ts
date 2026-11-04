import type { NoteColor } from "./types"

// Dessleptiki (demo) jeduel melumati: mydata/ders-jediwili.csv din ekelingen (tekrarlar chiqirilghan). Paydilinish CSV arqiliq özgertse bolidu (lib/schedule-csv.ts). Kéyin API/DB gha almashturush üchün peqet shu faylni özgertish kupaye.
// Kün: 0 = yekshenbe … 6 = shenbe (Date.getDay() bilen oxshash). Waqit: "HH:MM". Chisla: "yyyy-MM-dd".

export type Slot = { start: string; end: string }

export type Person = {
  id: string
  name: string
  color: NoteColor
  /** Heptilik musaitlik (her hepte tekrarlinidu): kün → boshluq aralighi */
  avail: Partial<Record<number, Slot[]>>
}

/** Her hepte tekrarlinidighan ders: [from, to] arilighidiki, exclude'din bashqa barliq heptilerde bolidu */
export type Lesson = {
  id: string
  personId: string
  day: number
  start: string
  end: string
  subject: string
  /** Bashlinish chisla (shu kün bilen) */
  from: string
  /** Axirlishish chisla (shu kün bilen) */
  to: string
  /** Ders bolmaydighan alahide künler */
  exclude?: string[]
  /** Waqti éniq emes / özgirip turidu: kartta sizilghan (dashed) körünidu */
  flexible?: boolean
}

export const SCHEDULE_START_HOUR = 8
export const SCHEDULE_END_HOUR = 21

export const defaultPeople: Person[] = [
  { id: "muhsine", name: "مۇخسىنە", color: "pink", avail: {} },
  { id: "ehsan", name: "ئېھسان بەگ", color: "blue", avail: {} },
  { id: "mahmud", name: "مەھمۇد", color: "green", avail: {} },
  { id: "musajan", name: "مۇساجان", color: "orange", avail: {} },
]

export const defaultLessons: Lesson[] = [
  { id: "l1", personId: "muhsine", day: 1, start: "08:30", end: "15:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l2", personId: "muhsine", day: 2, start: "08:30", end: "15:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l3", personId: "muhsine", day: 3, start: "08:30", end: "15:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l4", personId: "muhsine", day: 4, start: "08:30", end: "15:30", subject: "مەكتەپ دەرسى", from: "2026-10-15", to: "2027-01-17" },
  { id: "l5", personId: "muhsine", day: 5, start: "08:30", end: "15:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l6", personId: "ehsan", day: 1, start: "08:30", end: "13:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l7", personId: "ehsan", day: 2, start: "08:30", end: "13:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l8", personId: "ehsan", day: 3, start: "08:30", end: "13:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l9", personId: "ehsan", day: 4, start: "08:30", end: "13:00", subject: "مەكتەپ دەرسى", from: "2026-10-15", to: "2027-01-17" },
  { id: "l10", personId: "ehsan", day: 5, start: "08:30", end: "13:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l11", personId: "ehsan", day: 1, start: "16:00", end: "21:00", subject: "قۇرئان دەرسى", from: "2026-11-01", to: "2027-01-17" },
  { id: "l12", personId: "ehsan", day: 2, start: "16:00", end: "21:00", subject: "قۇرئان دەرسى", from: "2026-11-01", to: "2027-01-17" },
  { id: "l13", personId: "ehsan", day: 3, start: "16:00", end: "21:00", subject: "قۇرئان دەرسى", from: "2026-11-01", to: "2027-01-17" },
  { id: "l14", personId: "ehsan", day: 4, start: "16:00", end: "21:00", subject: "قۇرئان دەرسى", from: "2026-11-01", to: "2027-01-17" },
  { id: "l15", personId: "ehsan", day: 6, start: "16:00", end: "21:00", subject: "قۇرئان دەرسى", from: "2026-11-01", to: "2027-01-17" },
  { id: "l16", personId: "ehsan", day: 0, start: "16:00", end: "21:00", subject: "قۇرئان دەرسى", from: "2026-11-01", to: "2027-01-17" },
  { id: "l17", personId: "ehsan", day: 5, start: "14:00", end: "20:00", subject: "BİLSEM", from: "2026-10-01", to: "2027-01-17" },
  { id: "l18", personId: "ehsan", day: 6, start: "10:00", end: "12:00", subject: "ئانا تىل", from: "2026-10-01", to: "2027-01-17" },
  { id: "l19", personId: "mahmud", day: 1, start: "09:00", end: "14:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l20", personId: "mahmud", day: 2, start: "09:00", end: "14:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l21", personId: "mahmud", day: 3, start: "09:00", end: "14:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l22", personId: "mahmud", day: 4, start: "09:00", end: "14:00", subject: "مەكتەپ دەرسى", from: "2026-10-15", to: "2027-01-17" },
  { id: "l23", personId: "mahmud", day: 5, start: "09:00", end: "14:00", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l24", personId: "mahmud", day: 0, start: "12:00", end: "19:00", subject: "كۇتۇپخانا كۈنى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l25", personId: "mahmud", day: 1, start: "19:30", end: "20:30", subject: "قۇرئان دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l26", personId: "mahmud", day: 5, start: "19:30", end: "20:30", subject: "قۇرئان دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l27", personId: "mahmud", day: 6, start: "18:00", end: "18:45", subject: "ئەقىدە دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l28", personId: "mahmud", day: 0, start: "10:00", end: "11:30", subject: "ئانا تىل", from: "2026-10-05", to: "2027-01-17" },
  { id: "l29", personId: "musajan", day: 1, start: "08:30", end: "17:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l30", personId: "musajan", day: 2, start: "08:30", end: "17:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l33", personId: "musajan", day: 3, start: "08:30", end: "17:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l34", personId: "musajan", day: 4, start: "08:30", end: "17:30", subject: "مەكتەپ دەرسى", from: "2026-10-15", to: "2027-01-17" },
  { id: "l35", personId: "musajan", day: 5, start: "08:30", end: "17:30", subject: "مەكتەپ دەرسى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l36", personId: "muhsine", day: 1, start: "19:00", end: "20:00", subject: "كەچلىك دەرس", from: "2026-10-05", to: "2027-01-17" },
  { id: "l37", personId: "muhsine", day: 2, start: "19:00", end: "20:00", subject: "كەچلىك دەرس", from: "2026-10-05", to: "2027-01-17" },
  { id: "l38", personId: "muhsine", day: 3, start: "19:00", end: "20:00", subject: "كەچلىك دەرس", from: "2026-10-05", to: "2027-01-17" },
  { id: "l39", personId: "muhsine", day: 4, start: "19:00", end: "20:00", subject: "كەچلىك دەرس", from: "2026-10-15", to: "2027-01-17" },
  { id: "l40", personId: "muhsine", day: 5, start: "19:00", end: "20:00", subject: "كەچلىك دەرس", from: "2026-10-05", to: "2027-01-17" },
  { id: "l41", personId: "muhsine", day: 2, start: "20:00", end: "21:00", subject: "ياپون تىلى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l42", personId: "muhsine", day: 5, start: "20:00", end: "21:00", subject: "ياپون تىلى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l43", personId: "muhsine", day: 0, start: "20:00", end: "21:00", subject: "ياپون تىلى", from: "2026-10-05", to: "2027-01-17" },
  { id: "l44", personId: "muhsine", day: 6, start: "17:00", end: "19:00", subject: "ئانا تىل", from: "2026-10-05", to: "2027-01-17" },
  { id: "l45", personId: "mahmud", day: 1, start: "16:00", end: "18:00", subject: "ئىنگلىز تىلى", from: "2026-10-05", to: "2027-01-17", flexible: true },
  { id: "l46", personId: "mahmud", day: 2, start: "16:00", end: "18:00", subject: "ئىنگلىز تىلى", from: "2026-10-05", to: "2027-01-17", flexible: true },
  { id: "l47", personId: "mahmud", day: 3, start: "16:00", end: "18:00", subject: "ئىنگلىز تىلى", from: "2026-10-05", to: "2027-01-17", flexible: true },
  { id: "l48", personId: "mahmud", day: 4, start: "18:00", end: "21:00", subject: "ئىنگلىز تىلى", from: "2026-10-15", to: "2027-01-17", flexible: true },
  { id: "l49", personId: "mahmud", day: 5, start: "16:00", end: "18:00", subject: "ئىنگلىز تىلى", from: "2026-10-05", to: "2027-01-17", flexible: true },
  { id: "l50", personId: "mahmud", day: 6, start: "16:00", end: "18:00", subject: "ئىنگلىز تىلى", from: "2026-10-05", to: "2027-01-17", flexible: true },
]
