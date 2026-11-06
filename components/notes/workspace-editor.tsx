"use client"

import * as React from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import {
  NOTE_COLORS,
  WORKSPACE_EMOJIS,
  colorForCategory,
  type NoteColor,
  type Workspace,
} from "@/lib/types"
import { ug } from "@/lib/ug"
import { cn } from "@/lib/utils"
import { addWorkspace, removeWorkspace, updateWorkspace } from "@/lib/workspaces-store"

/** Workspace öchürüsh: aldi bilen notlardiki workspaceId boshitilidu (öchürülmeydu), andin workspace özi öchidu. */
export function useDeleteWorkspace() {
  const { notes, update } = useNotes()
  return React.useCallback(
    (id: string) => {
      for (const n of notes) if (n.workspaceId === id) update(n.id, { workspaceId: undefined })
      removeWorkspace(id)
    },
    [notes, update]
  )
}

function firstGrapheme(v: string) {
  const s = v.trim()
  if (!s) return ""
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    for (const g of new Intl.Segmenter().segment(s)) return g.segment
  }
  return Array.from(s)[0] ?? ""
}

/** Yéngi workspace qurush (workspace yoq) yaki tüzitish / öchürüsh (workspace bar) popover'i. */
export function WorkspaceEditor({
  workspace,
  onSaved,
  onDeleted,
  className,
}: {
  workspace?: Workspace
  onSaved?: (w: Workspace) => void
  onDeleted?: () => void
  className?: string
}) {
  const { notes } = useNotes()
  const deleteWorkspace = useDeleteWorkspace()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [emoji, setEmoji] = React.useState<string>(WORKSPACE_EMOJIS[0])
  const [color, setColor] = React.useState<NoteColor | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  function onOpenChange(next: boolean) {
    if (next) {
      setName(workspace?.name ?? "")
      setEmoji(workspace?.emoji ?? WORKSPACE_EMOJIS[0])
      setColor(workspace?.color)
      setConfirmDelete(false)
    }
    setOpen(next)
  }

  function save() {
    const n = name.trim()
    if (!n) return
    const finalColor = color ?? colorForCategory(n)
    if (workspace) {
      updateWorkspace(workspace.id, { name: n, emoji, color: finalColor })
      onSaved?.({ ...workspace, name: ug(n), emoji, color: finalColor })
    } else {
      const created = addWorkspace({ name: n, emoji, color: finalColor })
      onSaved?.(created)
    }
    setOpen(false)
  }

  const noteCount = workspace ? notes.filter((n) => n.workspaceId === workspace.id).length : 0

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        aria-label={workspace ? t.form.workspaceEdit : t.form.workspaceNew}
        className={cn(
          workspace
            ? "inline-flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            : "inline-flex h-7 items-center gap-1 rounded-full border border-dashed bg-background px-2.5 text-xs font-medium hover:bg-muted",
          className
        )}
      >
        {workspace ? <Pencil className="size-3" /> : <><Plus className="size-3" /> {t.form.workspaceNew}</>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-3 p-3">
        <div className="space-y-1.5">
          <Label>{t.form.workspaceName}</Label>
          <Input
            value={name}
            autoFocus
            onChange={(e) => setName(ug(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                save()
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t.form.workspaceEmoji}</Label>
          <div className="flex flex-wrap gap-1">
            {WORKSPACE_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emoji === e}
                onClick={() => setEmoji(e)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted",
                  emoji === e && "bg-secondary ring-1 ring-foreground/30"
                )}
              >
                {e}
              </button>
            ))}
          </div>
          <Input
            value={emoji}
            aria-label={t.form.workspaceEmoji}
            onChange={(e) => setEmoji(firstGrapheme(e.target.value))}
            className="w-20 text-center text-lg"
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t.form.color}</Label>
          <div className="flex gap-2">
            {NOTE_COLORS.map((c) => {
              const active = (color ?? colorForCategory(name.trim())) === c
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={active}
                  onClick={() => setColor(c)}
                  className={cn(
                    `note-${c} size-6 rounded-full border border-foreground/20 bg-(--note-chip) transition-transform`,
                    active && "scale-110 ring-2 ring-foreground/50 ring-offset-2 ring-offset-popover"
                  )}
                />
              )
            })}
          </div>
        </div>

        {confirmDelete && workspace && (
          <div className="space-y-2 rounded-lg bg-destructive/10 p-2 text-xs">
            <p className="font-medium">{t.form.workspaceDeleteTitle}</p>
            <p className="text-muted-foreground">{t.form.workspaceDeleteDesc(noteCount)}</p>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                {t.form.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  deleteWorkspace(workspace.id)
                  onDeleted?.()
                  setOpen(false)
                }}
              >
                {t.form.workspaceDelete}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {workspace && !confirmDelete ? (
            <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> {t.form.workspaceDelete}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" size="sm" onClick={save} disabled={!name.trim()}>
            {t.form.save}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
