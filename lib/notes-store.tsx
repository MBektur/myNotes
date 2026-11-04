"use client"

import * as React from "react"
import { toast } from "sonner"
import { deleteBlobs } from "./blobs"
import { t } from "./i18n"
import { hasLegacyData, markMigrated, readLegacySchedule, uploadLegacyNotes } from "./migrate"
import { deleteNotes, listNotes, rowToNote, upsertNotes } from "./notes-repo"
import { saveSchedule } from "./schedule-store"
import { supabase } from "./supabase/client"
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
  | { type: "remoteUpsert"; note: Note }
  | { type: "remoteRemove"; id: string }
  | { type: "add"; note: Note }
  | { type: "update"; id: string; patch: Partial<Note> }
  | { type: "remove"; id: string }
  | { type: "move"; id: string; status: Status }
  | { type: "reorder"; items: { id: string; status: Status; order: number }[] }
  | { type: "toggleChecklist"; id: string; itemId: string }
  | { type: "importMerge"; notes: Note[] }
  | { type: "importReplace"; notes: Note[] }

type State = { notes: Note[]; hydrated: boolean }

function reducer(state: State, a: Action): State {
  // hydrate: notes zaten normalize qilinghan (store snapshot bilen oxshash obyékt bolushi kerek)
  if (a.type === "hydrate") return { notes: a.notes, hydrated: true }
  return { ...state, notes: notesReducer(state.notes, a) }
}

function notesReducer(state: Note[], a: Action): Note[] {
  const now = new Date().toISOString()
  switch (a.type) {
    case "hydrate":
      return state
    case "remoteUpsert":
      return state.some((n) => n.id === a.note.id)
        ? state.map((n) => (n.id === a.note.id ? a.note : n))
        : [a.note, ...state]
    case "remoteRemove":
      return state.filter((n) => n.id !== a.id)
    case "add":
      return [a.note, ...state]
    case "update": {
      // Yalghuz renk özgirishi "yéngilanghan waqit"ni özgertmeydu, bolmisa kart tertipte sekrep ketidu.
      const colorOnly = Object.keys(a.patch).every((k) => k === "color")
      return state.map((n) =>
        n.id === a.id ? { ...n, ...a.patch, updatedAt: colorOnly ? n.updatedAt : now } : n
      )
    }
    case "remove":
      return state.filter((n) => n.id !== a.id)
    case "move":
      return state.map((n) =>
        n.id === a.id && n.status !== a.status
          ? { ...n, status: a.status, updatedAt: now }
          : n
      )
    case "reorder": {
      // Tertip özgirishi "yéngilanghan waqit"ni özgertmeydu; peqet ornini almashturghan (status özgergen) xatirila yéngilinidu.
      const by = new Map(a.items.map((i) => [i.id, i]))
      return state.map((n) => {
        const i = by.get(n.id)
        if (!i) return n
        return { ...n, order: i.order, ...(i.status !== n.status ? { status: i.status, updatedAt: now } : null) }
      })
    }
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
  reorder: (items: { id: string; status: Status; order: number }[]) => void
  toggleChecklist: (id: string, itemId: string) => void
  importMerge: (notes: Note[]) => void
  importReplace: (notes: Note[]) => void
}

function offerMigration(dispatch: React.Dispatch<Action>) {
  toast(t.sync.migratePrompt, {
    duration: Infinity,
    action: {
      label: t.sync.migrateAction,
      onClick: async () => {
        const id = toast.loading(t.sync.migrating)
        try {
          const local = (await uploadLegacyNotes()).map(normalizeNote)
          dispatch({ type: "importMerge", notes: local })
          const sched = readLegacySchedule()
          if (sched) saveSchedule(sched)
          markMigrated()
          toast.success(t.sync.migrated, { id })
        } catch {
          toast.error(t.sync.migrateFailed, { id })
        }
      },
    },
  })
}

const Ctx = React.createContext<Store | null>(null)

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [{ notes, hydrated }, dispatch] = React.useReducer(reducer, {
    notes: [],
    hydrated: false,
  })

  // Supabase'ke sinxronlanghan eng axirqi holet (id -> Note obyékti). Reducer özgertmigen xatirilerning obyékti oxshash qalidu,
  // shuning bilen "özgergenler" peqet obyékt sélishturush arqiliq tapilidu.
  const snapshot = React.useRef(new Map<string, Note>())
  const pending = React.useRef(0)
  const lastWrite = React.useRef(0)
  const queue = React.useRef<Promise<unknown>>(Promise.resolve())

  const load = React.useCallback(async (initial: boolean) => {
    try {
      const remote = (await listNotes()).map(normalizeNote)
      if (pending.current > 0) return // yézish dawamlishiwatidu: aldirimay yüklimeymiz
      snapshot.current = new Map(remote.map((n) => [n.id, n]))
      dispatch({ type: "hydrate", notes: remote })
      if (initial && remote.length === 0 && hasLegacyData()) offerMigration(dispatch)
    } catch {
      toast.error(t.sync.loadFailed)
    }
  }, [])

  React.useEffect(() => {
    void load(true)

    const db = supabase()
    const channel = db
      .channel("notes-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (p) => {
        // Özimizning yézishimiz yaki yéqinqi yézishning "echo"si bolsa étibar bermeymiz
        if (pending.current > 0 || Date.now() - lastWrite.current < 3000) return
        if (p.eventType === "DELETE") {
          const id = (p.old as { id?: string }).id
          if (!id || !snapshot.current.has(id)) return
          snapshot.current.delete(id)
          dispatch({ type: "remoteRemove", id })
          return
        }
        const note = normalizeNote(rowToNote(p.new))
        const cur = snapshot.current.get(note.id)
        if (cur && cur.updatedAt > note.updatedAt) return
        if (cur && cur.updatedAt === note.updatedAt && cur.order === note.order && cur.status === note.status) return
        snapshot.current.set(note.id, note)
        dispatch({ type: "remoteUpsert", note })
      })
      .subscribe()

    const onVisible = () => {
      if (document.visibilityState === "visible" && pending.current === 0 && Date.now() - lastWrite.current > 3000)
        void load(false)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      void db.removeChannel(channel)
    }
  }, [load])

  // Özgirishlerni (qoshush / yéngilash / öchürüsh) Supabase'ke yollash. Utuq yaki xata optimistik: UI aldin yéngilinidu.
  React.useEffect(() => {
    if (!hydrated) return
    const snap = snapshot.current
    const ids = new Set(notes.map((n) => n.id))
    const changed = notes.filter((n) => snap.get(n.id) !== n)
    const removed = [...snap.keys()].filter((id) => !ids.has(id))
    if (!changed.length && !removed.length) return
    changed.forEach((n) => snap.set(n.id, n))
    removed.forEach((id) => snap.delete(id))

    pending.current++
    lastWrite.current = Date.now()
    queue.current = queue.current
      .then(async () => {
        if (changed.length) await upsertNotes(changed)
        if (removed.length) await deleteNotes(removed)
        return false
      })
      .catch(() => {
        toast.error(t.sync.failed)
        return true
      })
      .then((failed) => {
        pending.current--
        lastWrite.current = Date.now()
        if (failed && pending.current === 0) void load(false) // serwer bilen qaytidin teng qilish
      })
  }, [notes, hydrated, load])

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
      remove: (id) => {
        deleteBlobs(notes.find((n) => n.id === id)?.attachments?.map((a) => a.id) ?? [])
        dispatch({ type: "remove", id })
      },
      move: (id, status) => dispatch({ type: "move", id, status }),
      reorder: (items) => dispatch({ type: "reorder", items }),
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
