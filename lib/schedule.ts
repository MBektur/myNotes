import type { Lesson, Slot } from "./schedule-data"

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export const fromMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

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

/**
 * layoutLanes bilen oxshash, lékin her kishi (key) kün ichide hemishe oxshash lane'ni igileydu (kishi tertipi = order).
 * Chüshüshmigen derslar toluq kenglikte qalidu; chüshüshse, kishi öz lane'ide turidu (bosh lane'lar qalidu).
 */
export function layoutLanesByKey<T extends { start: string; end: string }>(
  items: T[],
  keyOf: (item: T) => string,
  order: string[]
) {
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end))
  // 1) Chüshüshken guruplar
  const groups: T[][] = []
  let end = -1
  for (const item of sorted) {
    if (toMin(item.start) >= end) groups.push([])
    groups[groups.length - 1].push(item)
    end = Math.max(end, toMin(item.end))
  }
  // 2) Her kishi öz ichide chüshüshse ichki lane (sub)
  const sub = new Map<T, number>()
  const width = new Map<string, number>()
  for (const g of groups) {
    const ends = new Map<string, number[]>()
    for (const item of g) {
      const k = keyOf(item)
      const arr = ends.get(k) ?? []
      let i = arr.findIndex((e) => e <= toMin(item.start))
      if (i === -1) i = arr.length
      arr[i] = toMin(item.end)
      ends.set(k, arr)
      sub.set(item, i)
      width.set(k, Math.max(width.get(k) ?? 1, i + 1))
    }
  }
  // 3) Kün boyiche pozitsiye: kishi tertipi boyiche
  const keys = [...width.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const offset = new Map<string, number>()
  let total = 0
  for (const k of keys) { offset.set(k, total); total += width.get(k)! }
  // 4) Guruppining lanes = uning eng ong lane'i + 1
  const res: { item: T; lane: number; lanes: number }[] = []
  for (const g of groups) {
    const placed = g.map((item) => ({ item, lane: g.length === 1 ? 0 : offset.get(keyOf(item))! + sub.get(item)! }))
    const lanes = g.length === 1 ? 1 : Math.max(...placed.map((p) => p.lane)) + 1
    placed.forEach((p) => res.push({ ...p, lanes }))
  }
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
