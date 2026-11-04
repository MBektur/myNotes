import { getBlob, putBlob } from "./blobs"
import { hasStoredData, loadNotes } from "./storage"
import type { ScheduleData } from "./schedule-csv"
import type { Note } from "./types"

const DONE_KEY = "mynotes:migrated"
const SCHEDULE_KEY = "mynotes.schedule.v6"

function legacySchedule(): ScheduleData | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as ScheduleData
    return Array.isArray(d.people) && Array.isArray(d.lessons) ? d : null
  } catch {
    return null
  }
}

/** Bu brauzérda téxi buluttin yollanmighan yerlik (localStorage/IndexedDB) melumat barmu? */
export function hasLegacyData(): boolean {
  try {
    if (localStorage.getItem(DONE_KEY)) return false
    return (hasStoredData() && loadNotes().length > 0) || legacySchedule() !== null
  } catch {
    return false
  }
}

export function markMigrated() {
  try {
    localStorage.setItem(DONE_KEY, "1")
  } catch {}
}

/** Yerlik xatirilerni oquydu we ekliri (resim/PDF) Storage'gha yükleydu. Xatirilerni qayturidu; DB'gha yézishni store qilidu. */
export async function uploadLegacyNotes(): Promise<Note[]> {
  const notes = hasStoredData() ? loadNotes() : []
  for (const n of notes) {
    for (const a of n.attachments ?? []) {
      const blob = await getBlob(a.id).catch(() => undefined)
      if (blob) await putBlob(a.id, blob)
    }
  }
  return notes
}

export const readLegacySchedule = legacySchedule
