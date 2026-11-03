import { NOTE_COLORS, PRIORITIES, STATUSES, newId, type Note } from "./types"
import { todayStr } from "./filters"
import { ug } from "./ug"

const COLUMNS = [
  "id", "title", "content", "category", "tags", "status", "priority",
  "deadline", "color", "links", "checklist", "createdAt", "updatedAt",
] as const

const esc = (v: string) => (/[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** tags: "a;b" · links: "url|label;url2" · checklist: "[x] text;[ ] text" */
function row(n: Note): string[] {
  return [
    n.id,
    n.title ?? "",
    n.content ?? "",
    n.category ?? "",
    n.tags.join(";"),
    n.status,
    n.priority ?? "",
    n.deadline ?? "",
    n.color ?? "",
    n.links.map((l) => (l.label ? `${l.url}|${l.label}` : l.url)).join(";"),
    n.checklist.map((c) => `[${c.done ? "x" : " "}] ${c.text}`).join(";"),
    n.createdAt,
    n.updatedAt,
  ]
}

export function notesToCsv(notes: Note[]) {
  const lines = [COLUMNS.join(","), ...notes.map((n) => row(n).map(esc).join(","))]
  return "﻿" + lines.join("\r\n") // BOM: Excel UTF-8 (Uyghurche) toghra achsun
}

export function exportCsv(notes: Note[]) {
  const blob = new Blob([notesToCsv(notes)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `mynotes-${todayStr()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** RFC 4180 uslubidiki CSV parser (tirnaq, qosh tirnaq, bir xanida yéngi qur). */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^﻿/, "")
  // ayrghuch: birinchi qurdiki "," yaki ";" (Excel ayrim yerlerde ";" ishlitidu)
  const first = src.split(/\r?\n/, 1)[0] ?? ""
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ","
  const rows: string[][] = []
  let cur: string[] = []
  let cell = ""
  let q = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++ } else q = false
      } else cell += ch
    } else if (ch === '"') q = true
    else if (ch === sep) { cur.push(cell); cell = "" }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      cur.push(cell); cell = ""
      rows.push(cur); cur = []
    } else cell += ch
  }
  if (cell !== "" || cur.length) { cur.push(cell); rows.push(cur) }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

const split = (v: string) => v.split(";").map((x) => x.trim()).filter(Boolean)

export function parseCsv(text: string): Note[] | null {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return null
  const head = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (name: string) => head.indexOf(name.toLowerCase())
  // kamida bir tanish ustun bolushi kérek
  if (!["title", "content", "status", "id"].some((c) => idx(c) >= 0)) return null
  const get = (r: string[], name: string) => (idx(name) >= 0 ? (r[idx(name)] ?? "").trim() : "")
  const now = new Date().toISOString()

  return rows.slice(1).map((r) => {
    const status = get(r, "status")
    const priority = get(r, "priority")
    const color = get(r, "color")
    const deadline = get(r, "deadline")
    const note: Note = {
      id: get(r, "id") || newId(),
      status: (STATUSES as readonly string[]).includes(status) ? (status as Note["status"]) : "todo",
      createdAt: get(r, "createdAt") || now,
      updatedAt: get(r, "updatedAt") || now,
      title: ug(get(r, "title")) || undefined,
      content: ug(idx("content") >= 0 ? (r[idx("content")] ?? "") : "").trim() || undefined,
      category: ug(get(r, "category")) || undefined,
      tags: split(get(r, "tags")).map((t) => ug(t.replace(/^#+/, ""))),
      priority: (PRIORITIES as readonly string[]).includes(priority) ? (priority as Note["priority"]) : undefined,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : undefined,
      color: (NOTE_COLORS as readonly string[]).includes(color) ? (color as Note["color"]) : undefined,
      links: split(get(r, "links")).map((s, i) => {
        const [url, ...label] = s.split("|")
        return { id: `${i}-${newId()}`, url, label: label.join("|") || undefined }
      }),
      checklist: split(get(r, "checklist")).map((s, i) => {
        const m = s.match(/^\[(x| )\]\s*(.*)$/i)
        return { id: `${i}-${newId()}`, done: m ? m[1].toLowerCase() === "x" : false, text: ug(m ? m[2] : s) }
      }),
    }
    return note
  }).filter((n) => n.title || n.content || n.category || n.tags.length || n.checklist.length)
}
