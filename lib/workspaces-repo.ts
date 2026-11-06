import { supabase } from "./supabase/client"
import type { NoteColor, Workspace } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */
export function workspaceFromRow(r: any): Workspace {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji ?? undefined,
    color: (r.color ?? undefined) as NoteColor | undefined,
    order: r.sort_order ?? undefined,
  }
}

const workspaceToRow = (w: Workspace) => ({
  id: w.id,
  name: w.name,
  emoji: w.emoji ?? null,
  color: w.color ?? null,
  sort_order: w.order ?? null,
})

export async function listWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase().from("workspaces").select("*").order("created_at", { ascending: true })
  if (error) throw error
  return data.map(workspaceFromRow)
}

export async function upsertWorkspaces(list: Workspace[]) {
  if (!list.length) return
  const { error } = await supabase().from("workspaces").upsert(list.map(workspaceToRow), { onConflict: "user_id,id" })
  if (error) throw error
}

/** Aldi bilen notlarni boshitip, andin workspace'ni öchüridu (FK yoq). */
export async function deleteWorkspaces(ids: string[]) {
  if (!ids.length) return
  const db = supabase()
  const a = await db.from("notes").update({ workspace_id: null }).in("workspace_id", ids)
  if (a.error) throw a.error
  const b = await db.from("workspaces").delete().in("id", ids)
  if (b.error) throw b.error
}
