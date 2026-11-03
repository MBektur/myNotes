"use client"

import * as React from "react"
import { loadNotes, saveNotes } from "./storage"
import { newId, type Note, type Status } from "./types"
import { ug } from "./ug"

const u = (s?: string) => (s === undefined ? s : ug(s))
export function normalizeNote<T extends Partial<Note>>(n: T): T {
  const out: Partial<Note> = { ...n }
  if ("title" in n) out.title = u(n.title)
  if ("content" in n) out.content = u(n.content)
  if ("category" in n) out.category = u(n.category)
  if (n.tags) out.tags = n.tags.map((x) => ug(x))
  if (n.links) out.links = n.links.map((l) => ({ ...l, label: u(l.label) }))
  if (n.checklist) out.checklist = n.checklist.map((c) => ({ ...c, text: ug(c.text) }))
  return out as T
}

type Action =
  | { type: "hydrate"; notes: Note[] }
  | { type: "add"; note: Note }
  | { type: "update"; id: string; patch: Partial<Note> }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; status: Status }
  | { type: "toggleChecklist"; id: string; itemId: string }
  | { type: "importMerge"; notes: Note[] }
  | { type: "importReplace"; notes: Note[] }

type State = { notes: Note[]; hydrated: boolean }

function reducer(state: State, a: Action): State {
  if (a.type === "hydrate") return { notes: a.notes.map(normalizeNote), hydrated: true }
  return { ...state, notes: notesReducer(state.notes, a) }
}

function notesReducer(state: Note[], a: Action): Note[] {
  const now = new Date().toISOString()
  switch (a.type) {
    case "hydrate":
      return state
    case "add":
      return [a.note, ...state]
    case "update":
      return state.map((n) =>
        n.id === a.id ? { ...n, ...a.patch, updatedAt: now } : n
      )
    case "remove":
      return state.filter((n) => n.id !== a.id)
    case "move":
      return state.map((n) =>
        n.id === a.id && n.status !== a.status
          ? { ...n, status: a.status, updatedAt: now }
          : n
      )
    case "toggleChecklist":
      return state.map((n) =>
        n.id === a.id
          ? {
              ...n,
              updatedAt: now,
              checklist: n.checklist.map((c) =>
                c.id === a.itemId ? { ...c, done: !c.done } : c
              ),
            }
          : n
      )
    case "importMerge": {
      const map = new Map(state.map((n) => [n.id, n]))
      for (const inc of a.notes) {
        const cur = map.get(inc.id)
        if (!cur || inc.updatedAt > cur.updatedAt) map.set(inc.id, inc)
      }
      return Array.from(map.values())
    }
    case "importReplace":
      return a.notes
  }
}

type Store = {
  notes: Note[]
  hydrated: boolean
  add: (data: Partial<Note>) => Note
  update: (id: string, patch: Partial<Note>) => void
  remove: (id: string) => void
  move: (id: string, status: Status) => void
  toggleChecklist: (id: string, itemId: string) => void
  importMerge: (notes: Note[]) => void
  importReplace: (notes: Note[]) => void
}

const Ctx = React.createContext<Store | null>(null)

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [{ notes, hydrated }, dispatch] = React.useReducer(reducer, {
    notes: [],
    hydrated: false,
  })

  React.useEffect(() => {
    dispatch({ type: "hydrate", notes: loadNotes() })
  }, [])

  React.useEffect(() => {
    if (hydrated) saveNotes(notes)
  }, [notes, hydrated])

  const value = React.useMemo<Store>(
    () => ({
      notes,
      hydrated,
      add: (data) => {
        const now = new Date().toISOString()
        const note: Note = {
          status: "todo",
          tags: [],
          links: [],
          checklist: [],
          ...normalizeNote(data),
          id: newId(),
          createdAt: now,
          updatedAt: now,
        }
        dispatch({ type: "add", note })
        return note
      },
      update: (id, patch) => dispatch({ type: "update", id, patch: normalizeNote(patch) }),
      remove: (id) => dispatch({ type: "remove", id }),
      move: (id, status) => dispatch({ type: "move", id, status }),
      toggleChecklist: (id, itemId) =>
        dispatch({ type: "toggleChecklist", id, itemId }),
      importMerge: (n) => dispatch({ type: "importMerge", notes: n.map(normalizeNote) }),
      importReplace: (n) => dispatch({ type: "importReplace", notes: n.map(normalizeNote) }),
    }),
    [notes, hydrated]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotes() {
  const v = React.useContext(Ctx)
  if (!v) throw new Error("useNotes must be used inside NotesProvider")
  return v
}
