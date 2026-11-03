"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { CalendarDays, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { ug } from "@/lib/ug"
import { useNotes } from "@/lib/notes-store"
import {
  NOTE_COLORS,
  PRIORITIES,
  STATUSES,
  isNoteEmpty,
  newId,
  type Note,
  type NoteColor,
  type Priority,
  type Status,
} from "@/lib/types"

export type DialogTarget = { note?: Note; status?: Status; deadline?: string } | null

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function NoteForm({
  target,
  onClose,
}: {
  target: NonNullable<DialogTarget>
  onClose: () => void
}) {
  const { notes, add, update } = useNotes()
  const n = target.note
  const [title, setTitle] = React.useState(n?.title ?? "")
  const [content, setContent] = React.useState(n?.content ?? "")
  const [category, setCategory] = React.useState(n?.category ?? "")
  const [tags, setTags] = React.useState<string[]>(n?.tags ?? [])
  const [tagInput, setTagInput] = React.useState("")
  const [priority, setPriority] = React.useState<Priority | undefined>(n?.priority)
  const [deadline, setDeadline] = React.useState<string | undefined>(n?.deadline ?? target.deadline)
  const [status, setStatus] = React.useState<Status>(n?.status ?? target.status ?? "todo")
  const [color, setColor] = React.useState<NoteColor | undefined>(n?.color)
  const [links, setLinks] = React.useState(n?.links ?? [])
  const [checklist, setChecklist] = React.useState(n?.checklist ?? [])
  const [calOpen, setCalOpen] = React.useState(false)

  const categories = React.useMemo(
    () => Array.from(new Set(notes.map((x) => x.category).filter(Boolean) as string[])).sort(),
    [notes]
  )

  function commitTag() {
    const v = tagInput.trim().replace(/^#+/, "")
    if (v && !tags.includes(v)) setTags([...tags, v])
    setTagInput("")
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const pendingTag = tagInput.trim().replace(/^#+/, "")
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
    const data: Partial<Note> = {
      title: title.trim() || undefined,
      content: content.trim() || undefined,
      category: category.trim() || undefined,
      tags: finalTags,
      priority,
      deadline,
      status,
      color,
      links: links.filter((l) => l.url.trim()),
      checklist: checklist.filter((c) => c.text.trim()),
    }
    if (isNoteEmpty(data)) {
      toast.error(t.form.empty)
      return
    }
    if (n) update(n.id, data)
    else add(data)
    toast.success(t.form.saved)
    onClose()
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <Field label={t.form.title}>
          <Input value={title} onChange={(e) => setTitle(ug(e.target.value))} autoFocus />
        </Field>
        <Field label={t.form.content}>
          <Textarea value={content} onChange={(e) => setContent(ug(e.target.value))} rows={4} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.form.category}>
            <Input
              list="note-categories"
              value={category}
              placeholder={t.form.categoryNew}
              onChange={(e) => setCategory(ug(e.target.value))}
            />
            <datalist id="note-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label={t.status}>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => t.statuses[v as Status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{t.statuses[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.priority}>
            <Select
              value={priority ?? "none"}
              onValueChange={(v) => setPriority(v === "none" ? undefined : (v as Priority))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => (v === "none" ? t.form.none : t.priorities[v as Priority])}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.form.none}</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{t.priorities[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.form.deadline}>
            <div className="flex gap-1">
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger
                  render={<Button type="button" variant="outline" className="flex-1 justify-start font-normal" />}
                >
                  <CalendarDays />
                  {deadline ? deadline : t.form.pickDate}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline ? parseISO(deadline) : undefined}
                    defaultMonth={deadline ? parseISO(deadline) : undefined}
                    onSelect={(d) => {
                      setDeadline(d ? format(d, "yyyy-MM-dd") : undefined)
                      setCalOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              {deadline && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setDeadline(undefined)} aria-label={t.form.clearDate}>
                  <X />
                </Button>
              )}
            </div>
          </Field>
        </div>

        <Field label={t.form.tags}>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input p-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== tag))} aria-label="remove">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <input
              value={tagInput}
              placeholder={t.form.tagsHint}
              className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
              onChange={(e) => setTagInput(ug(e.target.value))}
              onBlur={commitTag}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  commitTag()
                } else if (e.key === "Backspace" && !tagInput && tags.length) {
                  setTags(tags.slice(0, -1))
                }
              }}
            />
          </div>
        </Field>

        <Field label={t.form.color}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setColor(undefined)}
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs text-muted-foreground",
                !color && "ring-2 ring-primary"
              )}
              aria-label="auto"
            >
              A
            </button>
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn(`note-${c}`, "note-surface size-7 rounded-full border", color === c && "ring-2 ring-primary")}
              />
            ))}
          </div>
        </Field>

        <Field label={t.form.links}>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={l.id} className="flex gap-1.5">
                <Input
                  placeholder={t.form.linkUrl}
                  value={l.url}
                  onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                />
                <Input
                  className="w-1/3"
                  placeholder={t.form.linkLabel}
                  value={l.label ?? ""}
                  onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: ug(e.target.value) || undefined } : x)))}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setLinks(links.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setLinks([...links, { id: newId(), url: "" }])}>
              <Plus /> {t.form.addLink}
            </Button>
          </div>
        </Field>

        <Field label={t.form.checklist}>
          <div className="space-y-2">
            {checklist.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  checked={c.done}
                  onCheckedChange={(v) => setChecklist(checklist.map((x, j) => (j === i ? { ...x, done: !!v } : x)))}
                />
                <Input
                  placeholder={t.form.itemPlaceholder}
                  value={c.text}
                  onChange={(e) => setChecklist(checklist.map((x, j) => (j === i ? { ...x, text: ug(e.target.value) } : x)))}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}>
                  <X />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setChecklist([...checklist, { id: newId(), text: "", done: false }])}>
              <Plus /> {t.form.addItem}
            </Button>
          </div>
        </Field>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 flex-row justify-end gap-2 px-4 py-3">
        <Button type="submit">{t.form.save}</Button>
        <Button type="button" variant="outline" onClick={onClose}>{t.form.cancel}</Button>
      </DialogFooter>
    </form>
  )
}

export function NoteDialog({
  target,
  onClose,
}: {
  target: DialogTarget
  onClose: () => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        dir="rtl"
        showCloseButton={false}
        className="flex max-h-[100dvh] flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[90vh] sm:max-w-xl"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <DialogTitle className="text-base">{target?.note ? t.editNote : t.newNote}</DialogTitle>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={t.form.cancel}>
            <X />
          </Button>
        </DialogHeader>
        {target && (
          <NoteForm key={target.note?.id ?? `new-${target.status ?? ""}-${target.deadline ?? ""}`} target={target} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}
