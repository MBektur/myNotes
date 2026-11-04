import type { SortBy } from "./filters"
import type { Note, ViewMode } from "./types"

const DATA_KEY = "mynotes:data"
const VIEW_KEY = "mynotes:view"
const SORT_KEY = "mynotes:sort"

export type StoredData = { version: 1; notes: Note[] }

export function hasStoredData(): boolean {
  try {
    return localStorage.getItem(DATA_KEY) !== null
  } catch {
    return true
  }
}

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.notes)) return []
    return parsed.notes as Note[]
  } catch {
    return []
  }
}

export function loadView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (v === "kanban" || v === "card" || v === "list") return v
  } catch {}
  return "kanban"
}

export function saveView(v: ViewMode) {
  try {
    localStorage.setItem(VIEW_KEY, v)
  } catch {}
}

const SORTS: readonly string[] = ["updated", "deadline", "priority", "title", "manual"]

export function loadSort(): SortBy {
  try {
    const v = localStorage.getItem(SORT_KEY)
    if (v && SORTS.includes(v)) return v as SortBy
  } catch {}
  return "priority"
}

export function saveSort(v: SortBy) {
  try {
    localStorage.setItem(SORT_KEY, v)
  } catch {}
}
