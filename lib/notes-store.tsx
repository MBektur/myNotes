"use client"

import * as React from "react"
import { toast } from "sonner"
import { deleteBlobs } from "./blobs"
import { demoNotes } from "./demo"
import { t } from "./i18n"
import { hasLegacyData, markMigrated, readLegacySchedule, uploadLegacyNotes } from "./migrate"
import { deleteNotes, listNotes, rowToNote, upsertNotes } from "./notes-repo"
import { saveSchedule } from "./schedule-store"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { readCache, writeCache } from "./cache"
import { currentUserId, supabase } from "./supabase/client"
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
  /** Peqet aktiv (arshivlanmighan) xatirilar: Xatire / Panel / Teqwim / izdesh shuni körüdu */
  notes: Note[]
  /** Arshivlanghan xatirilar (yéngi arshivlanghini aldida) */
  archived: Note[]
  /** Hemmisi (aktiv + arshiv): export / import / workspace tazilash üchün */
  all: Note[]
  hydrated: boolean
  add: (data: Partial<Note>) => Note
  update: (id: string, patch: Partial<Note>) => void
  /** Arshivgha yötkeydu (öchürmeydu) */
  archive: (id: string) => void
  restore: (id: string) => void
  /** Mengguluk öchüridu (peqet arshivdin chaqirilidu) */
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

/**
 * Hésabqa birinchi qétim kirgende xatire bolmisa demo xatirilerni özlükidin qoshidu. "Qilindi" belgisi hésabta
 * (user_metadata) saqlinidu: demo'lar öchürülse yaki bashqa qurulmidin kirilse qayta qoshulmaydu.
 * Xatiresi bar kona hésablar peqet belgilinidu.
 */
async function seedDemoOnce(dispatch: React.Dispatch<Action>, empty: boolean) {
  try {
    const db = supabase()
    const user = (await db.auth.getSession()).data.session?.user
    if (!user || user.user_metadata?.demo_seeded) return
    if (empty) dispatch({ type: "importMerge", notes: demoNotes(user.id).map(normalizeNote) })
    await db.auth.updateUser({ data: { demo_seeded: true } })
  } catch {
    // Belgilesh meghlup bolsa kéyinki qétim qayta sinilidu; id'ler sabit, köpeymeydu.
  }
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

  const uidRef = React.useRef<string | null>(null)

  // initial: aldi bilen keshtin (bolsa) tézla körsitip, andin Supabase'tin yéngilaydu.
  const load = React.useCallback(async (initial: boolean) => {
    try {
      if (initial) {
        const uid = await currentUserId()
        uidRef.current = uid
        const cached = readCache<Note[]>("notes", uid)
        if (cached) {
          const local = cached.map(normalizeNote)
          snapshot.current = new Map(local.map((n) => [n.id, n]))
          dispatch({ type: "hydrate", notes: local })
        }
      }
      const started = lastWrite.current
      const fetched = (await listNotes()).map(normalizeNote)
      // Yézish dawamlishiwatidu yaki sorash jeryanida yéngi yézish boldi: kone melumat bolushi mumkin, aldirimay yüklimeymiz
      if (pending.current > 0 || lastWrite.current !== started) return
      // Özgermigen xatirilarning obyéktini saqlaymiz (keraksiz qayta sizish bolmisun)
      const prev = snapshot.current
      const remote = fetched.map((n) => {
        const old = prev.get(n.id)
        return old && JSON.stringify(old) === JSON.stringify(n) ? old : n
      })
      const same = remote.length === prev.size && remote.every((n) => prev.get(n.id) === n)
      if (!same || initial) {
        snapshot.current = new Map(remote.map((n) => [n.id, n]))
        dispatch({ type: "hydrate", notes: remote })
      }
      if (uidRef.current) writeCache("notes", uidRef.current, remote)
      if (initial) {
        if (remote.length === 0 && hasLegacyData()) offerMigration(dispatch)
        else void seedDemoOnce(dispatch, remote.length === 0)
      }
    } catch {
      if (!initial) return // arqa pilanda yéngilash xatasi: jim
      toast.error(t.sync.loadFailed)
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    let channel: RealtimeChannel | null = null
    const db = supabase()
    const idle = () => pending.current === 0 && Date.now() - lastWrite.current > 3000

    // Realtime'ni birinchi yüklinishtin kéyin ulaymiz (ilk ötküzüsh kengliki tartishmisun)
    void load(true).then(() => {
      if (cancelled) return
      channel = db
        .channel("notes-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, (p) => {
          // Özimizning yézishimiz yaki yéqinqi yézishning "echo"si bolsa étibar bermeymiz
          if (!idle()) return
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
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("[notes] realtime:", status)
        })
    })

    // Ishenchlik üchün: Realtime ishlimisa (mes. jadwel yayinigha qoshulmighan) yaki üzülüp qalsa, körünüp turghan sehipide
    // 45 sékuntta bir qétim arqa pilanda yéngilaymiz. Özgirish bolmisa UI qayta sizilmaydu.
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && idle()) void load(false)
    }, 45000)
    const onVisible = () => {
      if (document.visibilityState === "visible" && idle()) void load(false)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", onVisible)
      if (channel) void db.removeChannel(channel)
    }
  }, [load])

  // Keshni yéngi holet bilen yéngilap turimiz (kéyinki achilishta tézla körünsun)
  React.useEffect(() => {
    if (!hydrated || !uidRef.current) return
    const uid = uidRef.current
    const id = window.setTimeout(() => writeCache("notes", uid, notes), 800)
    return () => window.clearTimeout(id)
  }, [notes, hydrated])

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
      notes: notes.filter((n) => !n.archivedAt),
      archived: notes.filter((n) => n.archivedAt).sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? "")),
      all: notes,
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
      archive: (id) => dispatch({ type: "update", id, patch: { archivedAt: new Date().toISOString() } }),
      restore: (id) => dispatch({ type: "update", id, patch: { archivedAt: undefined } }),
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
