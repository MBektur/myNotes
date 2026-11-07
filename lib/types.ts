export const STATUSES = ["todo", "in_progress", "review", "done"] as const
export type Status = (typeof STATUSES)[number]

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type Priority = (typeof PRIORITIES)[number]

export const NOTE_COLORS = [
  "blue",
  "purple",
  "pink",
  "orange",
  "green",
  "teal",
] as const
export type NoteColor = (typeof NOTE_COLORS)[number]

export const STATUS_VISUAL: Record<Status, { icon: string; color: NoteColor }> = {
  todo: { icon: "📝", color: "blue" },
  in_progress: { icon: "🚀", color: "orange" },
  review: { icon: "🔍", color: "purple" },
  done: { icon: "✅", color: "green" },
}

export const PRIORITY_VISUAL: Record<Priority, { icon: string; color: NoteColor }> = {
  low: { icon: "🌱", color: "teal" },
  medium: { icon: "⚡", color: "blue" },
  high: { icon: "🔥", color: "orange" },
  urgent: { icon: "🚨", color: "pink" },
}

export type NoteLink = { id: string; url: string; label?: string }
export type Attachment = {
  id: string
  kind: "image" | "pdf"
  name: string
  size: number
  type: string
}
export type ChecklistItem = { id: string; text: string; done: boolean }
// Nota xas hatirlatma (alarm). Hésablash: supabase/functions/send-reminders/occurrence.ts (server bilen ortaq)
import type { ReminderRule } from "@/supabase/functions/send-reminders/occurrence"
export type Reminder = ReminderRule
export type { ReminderRepeat, ReminderUnit } from "@/supabase/functions/send-reminders/occurrence"

/** Üst kategori: shexsiy / mektep / proyekt toplumi qatarliq. Notlar `workspaceId` arqiliq baghlinidu. */
export type Workspace = {
  id: string
  name: string
  emoji?: string
  color?: NoteColor
  /** Kichik = aldida */
  order?: number
}

export type Note = {
  id: string
  status: Status
  createdAt: string
  updatedAt: string
  title?: string
  content?: string
  category?: string
  workspaceId?: string
  /** Toldurulghan bolsa xatire arshivta (Xatire/Panel/Teqwimde körünmeydu); arshivdin kéyin ghinasi mengguluk öchürülidu */
  archivedAt?: string
  tags: string[]
  priority?: Priority
  deadline?: string
  /** Nota xas hatirlatmilar (waqit + tekrar); saet dilimi: reminder_settings.tz */
  reminders?: Reminder[]
  links: NoteLink[]
  checklist: ChecklistItem[]
  attachments?: Attachment[]
  color?: NoteColor
  /** Qolda tertiplesh (kanban sörep tertipligen) üchün orun nomuri; kichik = yuqiri */
  order?: number
}

export type ViewMode = "kanban" | "card" | "list"

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function colorForCategory(category?: string): NoteColor {
  if (!category) return "blue"
  let h = 0
  for (const ch of category) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return NOTE_COLORS[h % NOTE_COLORS.length]
}

export const WORKSPACE_EMOJIS = ["📁", "👤", "🏫", "👥", "💼", "🏠", "💻", "📚", "🎨", "🧪", "🚀", "🎯", "🛒", "✈️", "💡", "🌱"] as const

export function noteColor(n: Note): NoteColor {
  return n.color ?? colorForCategory(n.category)
}

export function isNoteEmpty(n: Partial<Note>) {
  return (
    !n.title?.trim() &&
    !n.content?.trim() &&
    !n.category?.trim() &&
    !(n.tags?.length) &&
    !n.priority &&
    !n.deadline &&
    !(n.reminders?.length) &&
    !(n.links?.length) &&
    !(n.checklist?.length) &&
    !(n.attachments?.length)
  )
}
