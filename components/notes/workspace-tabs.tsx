"use client"

import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { Filters } from "@/lib/filters"
import type { Note, NoteColor } from "@/lib/types"
import { useWorkspaces } from "@/lib/workspaces-store"
import { WorkspaceEditor } from "./workspace-editor"

/** Filtre taxtisi üstidiki yatay workspace rozetliri: biri bosilsa shu workspace, "Hemmisi" bosilsa süzgüch tazilinidu. */
export function WorkspaceTabs({
  notes,
  filters,
  setFilters,
}: {
  notes: Note[]
  filters: Filters
  setFilters: (f: Filters) => void
}) {
  const workspaces = useWorkspaces()
  const selected = filters.workspaces
  const only = selected.length === 1 ? workspaces.find((w) => w.id === selected[0]) : undefined

  const counts = new Map<string, number>()
  for (const n of notes) if (n.workspaceId) counts.set(n.workspaceId, (counts.get(n.workspaceId) ?? 0) + 1)

  // Kenglik / chégra qélinliqi / orun özgermeydu: peqet arqa reng özgiridu (normal: ching ochuq, tallanghan: toluq reng)
  const base = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors"
  const allChip = (active: boolean) =>
    cn(base, active ? "border-foreground bg-foreground text-background" : "border-foreground/10 bg-card")
  const wsChip = (color: NoteColor | undefined, active: boolean) =>
    cn(
      base,
      color ? `note-${color}` : "note-blue",
      "border-(--note-chip)",
      active ? "bg-(--note-chip)" : "bg-(--note-bg)/40"
    )

  return (
    <div
      role="group"
      aria-label={t.form.workspace}
      className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <button
        type="button"
        aria-pressed={selected.length === 0}
        onClick={() => setFilters({ ...filters, workspaces: [] })}
        className={allChip(selected.length === 0)}
      >
        <span aria-hidden>🌐</span> {t.all}
        <span className="text-xs opacity-60">{notes.length}</span>
      </button>

      {workspaces.map((w) => {
        const active = selected.includes(w.id)
        return (
          <button
            key={w.id}
            type="button"
            aria-pressed={active}
            onClick={() => setFilters({ ...filters, workspaces: active && selected.length === 1 ? [] : [w.id] })}
            className={wsChip(w.color, active)}
          >
            <span aria-hidden>{w.emoji ?? "📁"}</span>
            <span dir="auto" className="max-w-40 truncate">{w.name}</span>
            <span className="text-xs opacity-60">{counts.get(w.id) ?? 0}</span>
          </button>
        )
      })}

      {only && <WorkspaceEditor workspace={only} className="size-9 shrink-0" />}
      <WorkspaceEditor className="h-9 shrink-0 px-3 text-sm" />
    </div>
  )
}
