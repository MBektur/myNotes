"use client"

import { format, parseISO } from "date-fns"
import { ArchiveRestore, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import { noteColor } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useShell } from "./app-shell"
import { WorkspaceBadge } from "./workspace-badge"
import { stripMarkdown } from "@/lib/richtext"

const fmt = (iso?: string) => {
  try {
    return iso ? format(parseISO(iso), "yyyy-MM-dd HH:mm") : ""
  } catch {
    return iso ?? ""
  }
}

export function ArchivePage() {
  const { archived, hydrated, restore } = useNotes()
  const { open, askDelete } = useShell()

  if (!hydrated)
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    )

  if (archived.length === 0)
    return (
      <div className="clay flex flex-col items-center gap-2 py-16 text-center">
        <span className="text-4xl" aria-hidden>📦</span>
        <p className="font-medium">{t.archive.empty}</p>
        <p className="text-sm text-muted-foreground">{t.archive.emptyHint}</p>
      </div>
    )

  return (
    <ul className="flex flex-col gap-2.5">
      {archived.map((n) => (
        <li
          key={n.id}
          className={cn(
            `note-${noteColor(n)} note-surface flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 shadow-sm`
          )}
        >
          <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-start">
            <span className="block truncate font-medium" dir="auto">
              {n.title || stripMarkdown(n.content ?? "").slice(0, 80) || t.untitled}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-foreground/65">
              <WorkspaceBadge id={n.workspaceId} />
              {n.category && <Badge variant="secondary" className="bg-(--note-chip)">{n.category}</Badge>}
              <span className="tabular-nums">{t.archive.archivedAt} {fmt(n.archivedAt)}</span>
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                restore(n.id)
                toast.success(t.archive.restored)
              }}
            >
              <ArchiveRestore /> {t.archive.restore}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => askDelete(n)}>
              <Trash2 /> {t.archive.deletePermanent}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
