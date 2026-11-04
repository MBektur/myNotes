"use client"

import * as React from "react"
import { defaultLessons, defaultPeople } from "./schedule-data"
import type { ScheduleData } from "./schedule-csv"

const KEY = "mynotes.schedule.v3"
const DEFAULT: ScheduleData = { people: defaultPeople, lessons: defaultLessons }

let cache: ScheduleData | null = null
const listeners = new Set<() => void>()

function read(): ScheduleData {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as ScheduleData
      if (Array.isArray(d.people) && Array.isArray(d.lessons)) return (cache = d)
    }
  } catch {}
  return (cache = DEFAULT)
}

function emit() {
  listeners.forEach((l) => l())
}

export function saveSchedule(data: ScheduleData) {
  cache = data
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
  emit()
}

export function resetSchedule() {
  cache = DEFAULT
  try { localStorage.removeItem(KEY) } catch {}
  emit()
}

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** Dessleptiki jeduel yaki CSV arqiliq kirgüzülgen jeduel (brauzérda saqlinidu) */
export function useSchedule(): ScheduleData {
  return React.useSyncExternalStore(subscribe, read, () => DEFAULT)
}
