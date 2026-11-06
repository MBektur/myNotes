"use client"

import * as React from "react"
import { defaultLessons, defaultPeople } from "./schedule-data"
import { toast } from "sonner"
import { readCache, writeCache } from "./cache"
import { currentUserId, supabase } from "./supabase/client"
import { t } from "./i18n"
import type { ScheduleData } from "./schedule-csv"
import { fetchSchedule, pushSchedule } from "./schedule-repo"

const DEFAULT: ScheduleData = { people: defaultPeople, lessons: defaultLessons }

let cache: ScheduleData = DEFAULT
/** Eng axirqi sinxronlanghan holet (perqni hésablash üchün); null bolsa toluq almashturimiz. */
let synced: ScheduleData | null = null
let writes = 0
let lastWrite = 0
const listeners = new Set<() => void>()
let queue: Promise<unknown> = Promise.resolve()

function read(): ScheduleData {
  return cache
}

function emit() {
  listeners.forEach((l) => l())
}

/** Yazmalar tertipte (ketma-ket) ishlinidu; xata bolsa xewer berilidu. */
function enqueue(job: () => Promise<void>) {
  writes++
  lastWrite = Date.now()
  queue = queue
    .then(job)
    .catch(() => {
      synced = null
      toast.error(t.sync.failed)
    })
    .then(() => {
      writes--
      lastWrite = Date.now()
    })
}

/** Kirgendin kéyin bir qétim: Supabase'tiki programni yüklep keshke qoyidu (bolmisa dessleptiki). */
let uid: string | null = null

let teardown: (() => void) | null = null

async function refresh() {
  const t0 = lastWrite
  const remote = await fetchSchedule()
  // Yézish dawamlishiwatidu yaki yéqinda boldi: kone melumat bolushi mumkin
  if (writes > 0 || lastWrite !== t0) return
  const next = remote ?? DEFAULT
  synced = remote
  if (JSON.stringify(next) === JSON.stringify(cache)) return
  cache = next
  if (uid) writeCache("schedule", uid, remote)
  emit()
}

const idle = () => writes === 0 && Date.now() - lastWrite > 3000

export async function initSchedule() {
  teardown?.()
  teardown = null
  try {
    uid = await currentUserId()
    const cached = readCache<ScheduleData>("schedule", uid)
    if (cached) {
      cache = cached
      emit()
    }
    const remote = await fetchSchedule()
    cache = remote ?? DEFAULT
    synced = remote
    writeCache("schedule", uid, remote)
    emit()
  } catch {
    toast.error(t.sync.failed)
    return
  }
  // Realtime + körünüp turghanda yéngilash (jadwel yayinigha qoshulmighan bolsa 60 sékuntluq zapas)
  const db = supabase()
  let timer: number | undefined
  const run = () => idle() && void refresh().catch(() => {})
  const soon = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(run, 300)
  }
  const onVisible = () => document.visibilityState === "visible" && run()
  const channel = db
    .channel("schedule-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "schedule_people" }, soon)
    .on("postgres_changes", { event: "*", schema: "public", table: "schedule_lessons" }, soon)
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

export function saveSchedule(data: ScheduleData) {
  cache = data
  if (uid) writeCache("schedule", uid, data)
  emit()
  enqueue(async () => {
    const prev = synced
    await pushSchedule(data, prev)
    synced = data
  })
}

export function resetSchedule() {
  cache = DEFAULT
  if (uid) writeCache("schedule", uid, null)
  emit()
  enqueue(async () => {
    await pushSchedule({ people: [], lessons: [] }, synced)
    synced = null
  })
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** Dessleptiki schedule yaki CSV arqiliq kirgüzülgen schedule (Supabase'de saqlinidu) */
export function useSchedule(): ScheduleData {
  return React.useSyncExternalStore(subscribe, read, () => DEFAULT)
}

/* ---------- Sehipidiki süzgüch / körünüsh (brauzérda saqlinidu) ---------- */

export type ScheduleView = "week" | "timetable"
export type ScheduleUi = { hidden: string[]; view: ScheduleView }

const UI_KEY = "mynotes.schedule.ui.v1"

export function loadScheduleUi(): ScheduleUi {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (raw) {
      const d = JSON.parse(raw) as Partial<ScheduleUi>
      return {
        hidden: Array.isArray(d.hidden) ? d.hidden.filter((x): x is string => typeof x === "string") : [],
        view: d.view === "timetable" ? "timetable" : "week",
      }
    }
  } catch {}
  return { hidden: [], view: "week" }
}

export function saveScheduleUi(ui: ScheduleUi) {
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)) } catch {}
}
