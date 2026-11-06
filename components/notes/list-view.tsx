"use client"

import { CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { isOverdue, progressOf } from "@/lib/filters"
import { noteColor, type Note } from "@/lib/types"
import { useShell } from "./app-shell"
import { NoteMenu, openOnClick, priorityStyle } from "./note-card"
import { WorkspaceBadge } from "./workspace-badge"
import { stripMarkdown } from "@/lib/richtext"

export function ListView({
  notes,
  onEdit,
  onDelete,
}: {
  notes: Note[]
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
}) {
  const { open } = useShell()
  return (
    <ul className="divide-y overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      {notes.map((n) => {
        const p = progressOf(n)
        return (
          <li
            key={n.id}
            onClick={(e) => openOnClick(e, () => open(n))}
            className={cn(`note-${noteColor(n)}`, "flex cursor-pointer items-center gap-3 border-s-4 border-[var(--note-chip)] px-3 py-2.5 transition-colors hover:bg-muted/40")}
          >
            <button
              type="button"
              onClick={() => open(n)}
              className="flex min-w-0 flex-1 flex-col gap-1 text-start sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                {n.title || stripMarkdown(n.content ?? "").slice(0, 80) || t.untitled}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                <WorkspaceBadge id={n.workspaceId} variant="outline" />
                {n.category && <Badge variant="outline">{n.category}</Badge>}
                {n.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">#{tag}</Badge>
                ))}
                {n.priority && (
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", priorityStyle[n.priority])}>
                    {t.priorities[n.priority]}
                  </span>
                )}
                {p && <span className="text-muted-foreground">{p.pct}%</span>}
                {n.deadline && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      isOverdue(n) ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="size-3.5" /> {n.deadline}
                  </span>
                )}
                <Badge>{t.statuses[n.status]}</Badge>
              </span>
            </button>
            <NoteMenu note={n} onEdit={onEdit} onDelete={onDelete} />
          </li>
        )
      })}
    </ul>
  )
}
