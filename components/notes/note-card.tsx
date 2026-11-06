"use client"

import { Paragraphs } from "./paragraphs"
import * as React from "react"
import { Archive, CalendarDays, Check, Eye, Layers, Link2, Paperclip, MoreVertical, Pencil, Trash2, ArrowRightLeft } from "lucide-react"
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
import { useShell } from "./app-shell"
import { useNotes } from "@/lib/notes-store"
import { NOTE_COLORS, PRIORITY_VISUAL, STATUSES, noteColor, type Note } from "@/lib/types"
import { useWorkspaces } from "@/lib/workspaces-store"
import { WorkspaceBadge } from "./workspace-badge"

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
  const { move, update } = useNotes()
  const { open } = useShell()
  const workspaces = useWorkspaces()
  const wsOptions = [
    { id: undefined as string | undefined, emoji: "∅", name: t.actions.noWorkspace },
    ...workspaces.map((w) => ({ id: w.id as string | undefined, emoji: w.emoji ?? "📁", name: w.name })),
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t.actions.more} />}
      >
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => open(note)}>
          <Eye /> {t.actions.view}
        </DropdownMenuItem>
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Layers /> {t.actions.changeWorkspace}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {wsOptions.map((w) => {
              const current = (note.workspaceId ?? undefined) === w.id
              return (
                <DropdownMenuItem
                  key={w.id ?? "none"}
                  disabled={current}
                  onClick={() => update(note.id, { workspaceId: w.id })}
                >
                  <span aria-hidden className="w-5 text-center">{w.emoji}</span>
                  <span className="min-w-0 flex-1 truncate" dir="auto">{w.name}</span>
                  {current && <Check className="ms-auto" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(note)}>
          {note.archivedAt ? <Trash2 /> : <Archive />} {note.archivedAt ? t.archive.deletePermanent : t.actions.archive}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Element ichidiki metin line-clamp bilen késilgenmu-yoq tekshüridu. */
function useClamped<T extends HTMLElement>(dep: unknown) {
  const ref = React.useRef<T>(null)
  const [clamped, setClamped] = React.useState(false)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dep])
  return [ref, clamped] as const
}

/**
 * Kartning (yaki qurning) héchqandaq boshluq yérige bosqanda ochush üchün.
 * Ichidiki tugma/checkbox/menyu qatarliq interaktiv elémentlar öz ishini qilidu.
 * Portal arqiliq échilghan menyu (DOM'da kartning ichide emes) hésabqa élinmaydu.
 */
export function openOnClick(e: React.MouseEvent<HTMLElement>, open: () => void) {
  const target = e.target as Element
  if (!e.currentTarget.contains(target)) return
  if (target.closest("button, a, input, label, [role='checkbox'], [role='radio'], [role='menu'], [role='menuitem']")) return
  open()
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
  const { toggleChecklist, update } = useNotes()
  const { open } = useShell()
  const [titleRef, titleClamped] = useClamped<HTMLHeadingElement>(note.title)
  const [bodyRef, bodyClamped] = useClamped<HTMLSpanElement>(note.content)
  const current = noteColor(note)
  const progress = progressOf(note)
  const overdue = isOverdue(note)

  return (
    <div
      onClick={(e) => openOnClick(e, () => open(note))}
      className={cn(
        `note-${noteColor(note)} note-surface flex cursor-pointer flex-col rounded-3xl p-4 text-foreground transition-transform hover:-translate-y-0.5 shadow-[0_8px_20px_-8px_oklch(0.5_0.06_290/0.25),inset_0_2px_3px_oklch(1_0_0/0.7)]`,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          <WorkspaceBadge id={note.workspaceId} />
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
        onClick={() => open(note)}
      >
        <h3 ref={titleRef} className="line-clamp-2 font-medium leading-snug break-words">
          {note.title || (note.content ? "" : t.untitled)}
        </h3>
        {note.content && (
          <Paragraphs ref={bodyRef} text={note.content} className="mt-1 line-clamp-3 text-sm break-words text-foreground/70" />
        )}
      </button>
      {(titleClamped || bodyClamped) && (
        <button
          type="button"
          onClick={() => open(note)}
          className="mt-1 text-xs font-medium text-foreground/70 underline-offset-2 hover:underline"
        >
          {t.actions.readMore}
        </button>
      )}

      {note.checklist.length > 0 && (
        <ul className="mt-3 space-y-1.5" onPointerDown={(e) => e.stopPropagation()}>
          {note.checklist.slice(0, 5).map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                className="border-foreground/30 bg-white/70 data-checked:border-emerald-500 data-checked:bg-emerald-500 data-checked:text-white dark:bg-white/10"
                checked={c.done}
                onCheckedChange={() => toggleChecklist(note.id, c.id)}
              />
              <span className={cn("line-clamp-1 min-w-0 break-words", c.done && "text-foreground/50 line-through")}>{c.text}</span>
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

      <div className="mt-auto">
      {(note.priority || note.deadline || note.links.length > 0 || !!note.attachments?.length) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {note.priority && (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", priorityStyle[note.priority])}>
              <span aria-hidden>{PRIORITY_VISUAL[note.priority].icon}</span>
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
          {!!note.attachments?.length && (
            <span className="inline-flex items-center gap-1 text-foreground/70">
              <Paperclip className="size-3.5" /> {note.attachments.length}
            </span>
          )}
        </div>
      )}

      <div
        className="mt-3 flex items-center gap-1.5 border-t border-foreground/10 pt-2.5"
        onPointerDown={(e) => e.stopPropagation()}
        role="radiogroup"
        aria-label={t.form.color}
      >
        {NOTE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={current === c}
            aria-label={c}
            title={c}
            onClick={() => update(note.id, { color: c })}
            className={cn(
              `note-${c} note-surface size-5 rounded-full border border-foreground/15 shadow-sm transition-transform hover:scale-125`,
              current === c && "ring-2 ring-foreground/60 ring-offset-1 ring-offset-transparent"
            )}
          />
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ms-auto h-6 gap-1 px-2 text-xs"
          onClick={() => open(note)}
        >
          <Eye className="size-3.5" /> {t.actions.view}
        </Button>
      </div>
      </div>
    </div>
  )
}
