import type { Note, ViewMode } from "./types"

const DATA_KEY = "mynotes:data"
const VIEW_KEY = "mynotes:view"

export type StoredData = { version: 1; notes: Note[] }

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

export function saveNotes(notes: Note[]) {
  try {
    const data: StoredData = { version: 1, notes }
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
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
