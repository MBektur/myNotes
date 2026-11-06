import { supabase } from "./supabase/client"
import type { Note } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */
export function rowToNote(r: any): Note {
  return {
    id: r.id,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    title: r.title ?? undefined,
    content: r.content ?? undefined,
    category: r.category ?? undefined,
    workspaceId: r.workspace_id ?? undefined,
    tags: r.tags ?? [],
    priority: r.priority ?? undefined,
    deadline: r.deadline ?? undefined,
    links: r.links ?? [],
    checklist: r.checklist ?? [],
    attachments: r.attachments?.length ? r.attachments : undefined,
    color: r.color ?? undefined,
    order: r.sort_order ?? undefined,
  }
}

export function noteToRow(n: Note) {
  return {
    id: n.id,
    status: n.status,
    title: n.title ?? null,
    content: n.content ?? null,
    category: n.category ?? null,
    workspace_id: n.workspaceId ?? null,
    tags: n.tags,
    priority: n.priority ?? null,
    deadline: n.deadline ?? null,
    color: n.color ?? null,
    sort_order: n.order ?? null,
    links: n.links,
    checklist: n.checklist,
    attachments: n.attachments ?? [],
    created_at: n.createdAt,
    updated_at: n.updatedAt,
  }
}

const CHUNK = 100
function chunks<T>(a: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < a.length; i += CHUNK) out.push(a.slice(i, i + CHUNK))
  return out
}

export async function listNotes(): Promise<Note[]> {
  const out: Note[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase()
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...data.map(rowToNote))
    if (data.length < PAGE) break
  }
  return out
}

export async function upsertNotes(notes: Note[]) {
  for (const c of chunks(notes)) {
    const { error } = await supabase().from("notes").upsert(c.map(noteToRow))
    if (error) throw error
  }
}

export async function deleteNotes(ids: string[]) {
  for (const c of chunks(ids)) {
    const { error } = await supabase().from("notes").delete().in("id", c)
    if (error) throw error
  }
}
