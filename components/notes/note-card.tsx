"use client"

import { CalendarDays, Link2, MoreVertical, Pencil, Trash2, ArrowRightLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { isOverdue, progressOf } from "@/lib/filters"
import { useNotes } from "@/lib/notes-store"
import { STATUSES, noteColor, type Note } from "@/lib/types"

export const priorityStyle: Record<string, string> = {
  low: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  urgent: "bg-red-500/20 text-red-700 dark:text-red-300",
}

export function NoteMenu({
  note,
  onEdit,
  onDelete,
}: {
  note: Note
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
}) {
  const { move } = useNotes()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t.actions.more} />}
      >
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onEdit(note)}>
          <Pencil /> {t.actions.edit}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ArrowRightLeft /> {t.actions.changeStatus}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={s === note.status}
                onClick={() => move(note.id, s)}
              >
                {t.statuses[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(note)}>
          <Trash2 /> {t.actions.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function NoteCard({
  note,
  onEdit,
  onDelete,
  className,
}: {
  note: Note
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
  className?: string
}) {
  const { toggleChecklist } = useNotes()
  const progress = progressOf(note)
  const overdue = isOverdue(note)

  return (
    <div
      className={cn(
        `note-${noteColor(note)} note-surface rounded-3xl p-4 text-foreground shadow-[0_8px_20px_-8px_oklch(0.5_0.06_290/0.25),inset_0_2px_3px_oklch(1_0_0/0.7)]`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {note.category && (
            <Badge variant="secondary" className="bg-[var(--note-chip)]">
              {note.category}
            </Badge>
          )}
          {note.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-[var(--note-chip)]">
              #{tag}
            </Badge>
          ))}
        </div>
        <div className="-me-2 -mt-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <NoteMenu note={note} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      <button
        type="button"
        className="mt-2 block w-full text-start"
        onClick={() => onEdit(note)}
      >
        <h3 className="font-semibold leading-snug break-words">
          {note.title || (note.content ? "" : t.untitled)}
        </h3>
        {note.content && (
          <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-foreground/70">
            {note.content}
          </p>
        )}
      </button>

      {note.checklist.length > 0 && (
        <ul className="mt-3 space-y-1.5" onPointerDown={(e) => e.stopPropagation()}>
          {note.checklist.slice(0, 5).map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                className="border-foreground/30 bg-white/70 data-checked:border-emerald-500 data-checked:bg-emerald-500 data-checked:text-white dark:bg-white/10"
                checked={c.done}
                onCheckedChange={() => toggleChecklist(note.id, c.id)}
              />
              <span className={cn(c.done && "text-foreground/50 line-through")}>{c.text}</span>
            </li>
          ))}
          {note.checklist.length > 5 && (
            <li className="text-xs text-foreground/60">+{note.checklist.length - 5}</li>
          )}
        </ul>
      )}

      {progress && (
        <div className="mt-3 flex items-center gap-2" aria-label={t.progress}>
          <div className="flex gap-0.5">
            {note.checklist.slice(0, 10).map((c) => (
              <span
                key={c.id}
                className={cn(
                  "size-1.5 rounded-full",
                  c.done ? "bg-foreground/70" : "bg-foreground/20"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground/70">{progress.pct}%</span>
        </div>
      )}

      {(note.priority || note.deadline || note.links.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {note.priority && (
            <span className={cn("rounded-full px-2 py-0.5 font-medium", priorityStyle[note.priority])}>
              {t.priorities[note.priority]}
            </span>
          )}
          {note.deadline && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue ? "font-medium text-red-600 dark:text-red-400" : "text-foreground/70"
              )}
            >
              <CalendarDays className="size-3.5" /> {note.deadline}
            </span>
          )}
          {note.links.length > 0 && (
            <span className="inline-flex items-center gap-1 text-foreground/70">
              <Link2 className="size-3.5" /> {note.links.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
