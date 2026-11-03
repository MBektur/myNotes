import { todayStr } from "./filters"
import { PRIORITIES, type Note } from "./types"

export function computeStats(notes: Note[]) {
  const month = todayStr().slice(0, 7)
  return {
    todo: notes.filter((n) => n.status === "todo").length,
    inProgress: notes.filter((n) => n.status === "in_progress").length,
    completedThisMonth: notes.filter(
      (n) => n.status === "done" && n.updatedAt.slice(0, 7) === month
    ).length,
    completedTotal: notes.filter((n) => n.status === "done").length,
    checklistDone: notes.reduce((a, n) => a + n.checklist.filter((c) => c.done).length, 0),
    checklistTotal: notes.reduce((a, n) => a + n.checklist.length, 0),
  }
}

/** Son 7 gün (eskiden yeniye): günlük güncellenen not sayısı. */
export function weeklyActivity(notes: Note[]) {
  const out: { date: string; weekday: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = todayStr(d)
    out.push({
      date,
      weekday: d.getDay(),
      count: notes.filter((n) => todayStr(new Date(n.updatedAt)) === date).length,
    })
  }
  return out
}

export function categoryProgress(notes: Note[]) {
  const map = new Map<string, { done: number; total: number }>()
  for (const n of notes) {
    if (!n.category) continue
    const e = map.get(n.category) ?? { done: 0, total: 0 }
    e.total++
    if (n.status === "done") e.done++
    map.set(n.category, e)
  }
  return [...map].map(([category, v]) => ({
    category,
    ...v,
    pct: Math.round((v.done / v.total) * 100),
  }))
}

export function upcoming(notes: Note[], limit = 5) {
  return notes
    .filter((n) => n.deadline && n.status !== "done")
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
    .slice(0, limit)
}

export function topTasks(notes: Note[], limit = 5) {
  return [...notes]
    .sort(
      (a, b) =>
        (b.priority ? PRIORITIES.indexOf(b.priority) : -1) -
        (a.priority ? PRIORITIES.indexOf(a.priority) : -1)
    )
    .slice(0, limit)
}

