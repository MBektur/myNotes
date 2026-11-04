"use client"

import * as React from "react"
import { defaultLessons, defaultPeople } from "./schedule-data"
import { toast } from "sonner"
import { readCache, writeCache } from "./cache"
import { currentUserId } from "./supabase/client"
import { t } from "./i18n"
import type { ScheduleData } from "./schedule-csv"
import { clearRemoteSchedule, fetchSchedule, pushSchedule } from "./schedule-repo"

const DEFAULT: ScheduleData = { people: defaultPeople, lessons: defaultLessons }

let cache: ScheduleData = DEFAULT
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
  queue = queue.then(job).catch(() => {
    toast.error(t.sync.failed)
  })
}

/** Kirgendin kéyin bir qétim: Supabase'tiki programni yüklep keshke qoyidu (bolmisa dessleptiki). */
let uid: string | null = null

export async function initSchedule() {
  try {
    uid = await currentUserId()
    const cached = readCache<ScheduleData>("schedule", uid)
    if (cached) {
      cache = cached
      emit()
    }
    const remote = await fetchSchedule()
    cache = remote ?? DEFAULT
    writeCache("schedule", uid, remote)
    emit()
  } catch {
    toast.error(t.sync.failed)
  }
}

export function saveSchedule(data: ScheduleData) {
  cache = data
  if (uid) writeCache("schedule", uid, data)
  emit()
  enqueue(() => pushSchedule(data))
}

export function resetSchedule() {
  cache = DEFAULT
  if (uid) writeCache("schedule", uid, null)
  emit()
  enqueue(clearRemoteSchedule)
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
