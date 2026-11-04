import type { Lesson, Slot } from "./schedule-data"

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export type Range = [number, number]

const merge = (rs: Range[]): Range[] => {
  const out: Range[] = []
  for (const r of [...rs].sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else out.push([r[0], r[1]])
  }
  return out
}

/** a din b ni chiqirip tashlaydu */
export function subtract(a: Range[], b: Range[]): Range[] {
  let cur = merge(a)
  for (const [bs, be] of merge(b)) {
    const next: Range[] = []
    for (const [s, e] of cur) {
      if (be <= s || bs >= e) next.push([s, e])
      else {
        if (bs > s) next.push([s, bs])
        if (be < e) next.push([be, e])
      }
    }
    cur = next
  }
  return cur
}

export function intersect(a: Range[], b: Range[]): Range[] {
  const out: Range[] = []
  for (const [as, ae] of a)
    for (const [bs, be] of b) {
      const s = Math.max(as, bs)
      const e = Math.min(ae, be)
      if (s < e) out.push([s, e])
    }
  return merge(out)
}

export const slotsToRanges = (slots: Slot[] = []): Range[] => slots.map((x) => [toMin(x.start), toMin(x.end)])

/** Bir-birige chüshüp qalghan derslerni yenpa-yen tizish (lane) */
export function layoutLanes<T extends { start: string; end: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end))
  const res: { item: T; lane: number; lanes: number }[] = []
  let group: typeof res = []
  let groupEnd = -1
  let laneEnds: number[] = []
  const flush = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1))
    group.forEach((g) => (g.lanes = lanes))
    res.push(...group)
    group = []
    laneEnds = []
  }
  for (const item of sorted) {
    const s = toMin(item.start)
    if (s >= groupEnd) flush()
    let lane = laneEnds.findIndex((e) => e <= s)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = toMin(item.end)
    groupEnd = Math.max(groupEnd, toMin(item.end))
    group.push({ item, lane, lanes: 1 })
  }
  flush()
  return res
}

/** Muayyen bir kün (yyyy-MM-dd, weekday) üchün derslerni qayturidu */
export function lessonsOn(lessons: Lesson[], dateKey: string, weekday: number): Lesson[] {
  return lessons.filter(
    (l) => l.day === weekday && dateKey >= l.from && dateKey <= l.to && !l.exclude?.includes(dateKey)
  )
}

/** Her benzersiz ders ati üchün hue (0–360): alfabet tertipi boyiche tolimu teng teqsimlinidu, shunga reng chaqishmaydu */
export function subjectHues(lessons: Lesson[]): Map<string, number> {
  const names = [...new Set(lessons.map((l) => l.subject))].sort((a, b) => a.localeCompare(b))
  return new Map(names.map((n, i) => [n, Math.round((i * 360) / names.length + 15) % 360]))
}
