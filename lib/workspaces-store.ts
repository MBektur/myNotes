"use client"

import * as React from "react"
import { toast } from "sonner"
import { readCache, writeCache } from "./cache"
import { t } from "./i18n"
import { currentUserId, supabase } from "./supabase/client"
import { newId, type NoteColor, type Workspace } from "./types"
import { ug } from "./ug"
import { deleteWorkspaces, listWorkspaces, upsertWorkspaces } from "./workspaces-repo"

// schedule-store.ts bilen oxshash qurulma: modul derijiside holet + useSyncExternalStore, yézish tertipte, realtime.
const EMPTY: Workspace[] = []
let cache: Workspace[] = EMPTY
/** Eng axirqi sinxronlanghan holet (id -> Workspace); perqni shuningdin hésaplaymiz. */
let synced = new Map<string, Workspace>()
let uid: string | null = null
let writes = 0
let lastWrite = 0
let queue: Promise<unknown> = Promise.resolve()
let teardown: (() => void) | null = null
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())
const idle = () => writes === 0 && Date.now() - lastWrite > 3000

function sorted(list: Workspace[]): Workspace[] {
  return [...list].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
}

function normalize(w: Workspace): Workspace {
  return { ...w, name: ug(w.name).trim() }
}

function set(next: Workspace[]) {
  cache = next
  if (uid) writeCache("workspaces", uid, next)
  emit()
}

function flush() {
  writes++
  lastWrite = Date.now()
  queue = queue
    .then(async () => {
      const target = cache
      const ids = new Set(target.map((w) => w.id))
      const changed = target.filter((w) => JSON.stringify(synced.get(w.id)) !== JSON.stringify(w))
      const removed = [...synced.keys()].filter((id) => !ids.has(id))
      await upsertWorkspaces(changed)
      await deleteWorkspaces(removed)
      synced = new Map(target.map((w) => [w.id, w]))
    })
    .catch(() => toast.error(t.sync.failed)) // synced özgermeydu: kéyinki yézishta qaytidin sinaymiz
    .then(() => {
      writes--
      lastWrite = Date.now()
    })
}

async function refresh() {
  const started = lastWrite
  const remote = sorted((await listWorkspaces()).map(normalize))
  if (writes > 0 || lastWrite !== started) return
  synced = new Map(remote.map((w) => [w.id, w]))
  if (JSON.stringify(remote) === JSON.stringify(cache)) return
  set(remote)
}

export async function initWorkspaces() {
  teardown?.()
  teardown = null
  try {
    uid = await currentUserId()
    const cached = readCache<Workspace[]>("workspaces", uid)
    cache = cached ?? EMPTY
    emit()
    const remote = sorted((await listWorkspaces()).map(normalize))
    synced = new Map(remote.map((w) => [w.id, w]))
    set(remote)
  } catch {
    toast.error(t.sync.loadFailed)
    return
  }
  const db = supabase()
  let timer: number | undefined
  const run = () => idle() && void refresh().catch(() => {})
  const soon = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(run, 300)
  }
  const onVisible = () => document.visibilityState === "visible" && run()
  const channel = db
    .channel("workspaces-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "workspaces" }, soon)
    .subscribe()
  const poll = window.setInterval(onVisible, 60000)
  document.addEventListener("visibilitychange", onVisible)
  teardown = () => {
    window.clearTimeout(timer)
    window.clearInterval(poll)
    document.removeEventListener("visibilitychange", onVisible)
    void db.removeChannel(channel)
  }
}

export type WorkspaceInput = { name: string; emoji?: string; color?: NoteColor }

export function addWorkspace(input: WorkspaceInput): Workspace {
  const last = cache.reduce((m, w) => Math.max(m, w.order ?? 0), 0)
  const ws = normalize({ id: newId(), ...input, order: last + 1 })
  set([...cache, ws])
  flush()
  return ws
}

export function updateWorkspace(id: string, patch: Partial<WorkspaceInput>) {
  if (!cache.some((w) => w.id === id)) return
  set(cache.map((w) => (w.id === id ? normalize({ ...w, ...patch }) : w)))
  flush()
}

/** Notlardiki workspaceId'ni boshitish chaqirghuchining wezipisi (qarang: useDeleteWorkspace, workspace-editor.tsx). */
export function removeWorkspace(id: string) {
  set(cache.filter((w) => w.id !== id))
  flush()
}

/** JSON import: id boyiche qoshup/yéngilaydu. */
export function mergeWorkspaces(list: Workspace[]) {
  if (!list.length) return
  const by = new Map(cache.map((w) => [w.id, w]))
  for (const w of list) by.set(w.id, normalize(w))
  set(sorted([...by.values()]))
  flush()
}

/** CSV import: ad -> id; tépilmighan adlar yéngi workspace bolidu. */
export function ensureWorkspacesByName(names: string[]): Map<string, string> {
  const out = new Map<string, string>()
  const added: Workspace[] = []
  let order = cache.reduce((m, w) => Math.max(m, w.order ?? 0), 0)
  for (const raw of names) {
    const name = ug(raw).trim()
    if (!name || out.has(name)) continue
    const found = cache.find((w) => w.name === name) ?? added.find((w) => w.name === name)
    if (found) {
      out.set(name, found.id)
      continue
    }
    const ws: Workspace = { id: newId(), name, emoji: "📁", order: ++order }
    added.push(ws)
    out.set(name, ws.id)
  }
  if (added.length) {
    set([...cache, ...added])
    flush()
  }
  return out
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useWorkspaces(): Workspace[] {
  return React.useSyncExternalStore(
    subscribe,
    () => cache,
    () => EMPTY
  )
}
