import { z } from "zod"
import { NOTE_COLORS, PRIORITIES, STATUSES, type Note } from "./types"
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
  tags: z.array(z.string()).default([]),
  priority: z.enum(PRIORITIES).optional(),
  deadline: z.string().optional(),
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
})

const fileSchema = z.object({ version: z.number(), notes: z.array(noteSchema) })

export function exportJson(notes: Note[]) {
  const blob = new Blob([JSON.stringify({ version: 1, notes }, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `mynotes-${todayStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function parseImport(file: File): Promise<Note[] | null> {
  try {
    if (/\.csv$/i.test(file.name) || file.type === "text/csv") return parseCsv(await file.text())
    const json = JSON.parse(await file.text())
    const res = fileSchema.safeParse(json)
    return res.success ? (res.data.notes as Note[]) : null
  } catch {
    return null
  }
}
