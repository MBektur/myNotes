import { z } from "zod"
import { NOTE_COLORS, PRIORITIES, STATUSES, type Note, type Workspace } from "./types"
import { todayStr } from "./filters"
import { parseCsv } from "./csv"

const noteSchema = z.object({
  id: z.string().min(1),
  status: z.enum(STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  category: z.string().optional(),
  workspaceId: z.string().optional(),
  archivedAt: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.enum(PRIORITIES).optional(),
  deadline: z.string().optional(),
  reminders: z
    .array(
      z.object({
        id: z.string(),
        at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
        repeat: z.object({ every: z.number().int().min(1).max(999), unit: z.enum(["minute", "hour", "day", "week", "month"]) }).optional(),
      })
    )
    .optional(),
  links: z
    .array(z.object({ id: z.string(), url: z.string(), label: z.string().optional() }))
    .default([]),
  checklist: z
    .array(z.object({ id: z.string(), text: z.string(), done: z.boolean() }))
    .default([]),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["image", "pdf"]),
        name: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .optional(),
  color: z.enum(NOTE_COLORS).optional(),
  order: z.number().optional(),
})

const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  emoji: z.string().optional(),
  color: z.enum(NOTE_COLORS).optional(),
  order: z.number().optional(),
})

const fileSchema = z.object({
  version: z.number(),
  notes: z.array(noteSchema),
  workspaces: z.array(workspaceSchema).default([]),
})

/** noteWorkspace: CSV'dá workspace peqet at bilen kélidu (xatire id -> at). */
export type ImportData = { notes: Note[]; workspaces: Workspace[]; noteWorkspace?: Map<string, string> }

export function exportJson(notes: Note[], workspaces: Workspace[] = []) {
  const blob = new Blob([JSON.stringify({ version: 1, workspaces, notes }, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `mynotes-${todayStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function parseImport(file: File): Promise<ImportData | null> {
  try {
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
      const csv = parseCsv(await file.text())
      return csv ? { notes: csv.notes, workspaces: [], noteWorkspace: csv.noteWorkspace } : null
    }
    const json = JSON.parse(await file.text())
    const res = fileSchema.safeParse(json)
    return res.success ? { notes: res.data.notes as Note[], workspaces: res.data.workspaces } : null
  } catch {
    return null
  }
}
