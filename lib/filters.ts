import { ug } from "./ug"
import { PRIORITIES, type Note, type Priority, type Status } from "./types"

export type Filters = {
  query: string
  statuses: Status[]
  categories: string[]
  tags: string[]
  priorities: Priority[]
  deadline?: "overdue" | "week" | "none"
}

export type SortBy = "updated" | "deadline" | "priority" | "title"

export const emptyFilters: Filters = { query: "", statuses: [], categories: [], tags: [], priorities: [] }

export function todayStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function isOverdue(n: Note) {
  return !!n.deadline && n.status !== "done" && n.deadline < todayStr()
}

function haystack(n: Note) {
  return [
    n.title,
    n.content,
    n.category,
    ...n.tags,
    ...n.links.flatMap((l) => [l.url, l.label]),
    ...n.checklist.map((c) => c.text),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()
}

export function searchNotes(notes: Note[], query: string) {
  const q = ug(query.trim().toLowerCase().replace(/^#/, ""))
  if (!q) return notes
  return notes.filter((n) => haystack(n).includes(q))
}

export function filterNotes(notes: Note[], f: Filters) {
  let out = searchNotes(notes, f.query)
  if (f.statuses.length) out = out.filter((n) => f.statuses.includes(n.status))
  if (f.categories.length) out = out.filter((n) => !!n.category && f.categories.includes(n.category))
  if (f.tags.length) out = out.filter((n) => f.tags.every((t) => n.tags.includes(t)))
  if (f.priorities.length) out = out.filter((n) => !!n.priority && f.priorities.includes(n.priority))
  if (f.deadline) {
    const today = todayStr()
    const weekEnd = todayStr(new Date(Date.now() + 7 * 86400000))
    out = out.filter((n) => {
      if (f.deadline === "none") return !n.deadline
      if (!n.deadline) return false
      if (f.deadline === "overdue") return isOverdue(n)
      return n.deadline >= today && n.deadline <= weekEnd
    })
  }
  return out
}

export function sortNotes(notes: Note[], by: SortBy) {
  const arr = [...notes]
  switch (by) {
    case "updated":
      return arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    case "deadline":
      return arr.sort((a, b) =>
        (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999")
      )
    case "priority":
      return arr.sort(
        (a, b) =>
          (b.priority ? PRIORITIES.indexOf(b.priority) : -1) -
          (a.priority ? PRIORITIES.indexOf(a.priority) : -1)
      )
    case "title":
      return arr.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""))
  }
}

export function hasActiveFilters(f: Filters) {
  return !!(f.query || f.statuses.length || f.categories.length || f.tags.length || f.priorities.length || f.deadline)
}

export function progressOf(n: Note) {
  if (!n.checklist.length) return null
  const done = n.checklist.filter((c) => c.done).length
  return { done, total: n.checklist.length, pct: Math.round((done / n.checklist.length) * 100) }
}
