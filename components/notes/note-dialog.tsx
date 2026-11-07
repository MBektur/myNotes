"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { AlignLeft, Bell, Check, CalendarDays, CheckSquare, ChevronDown, FileText, Flag, Folder, Hash, Layers, Link2, Paperclip, Palette, Plus, Type, X, Activity } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { SidePanel, panelBtn } from "@/components/ui/side-panel"
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
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { ug } from "@/lib/ug"
import { useNotes } from "@/lib/notes-store"
import { useWorkspaces } from "@/lib/workspaces-store"
import { RichTextarea } from "./rich-textarea"
import { WorkspaceEditor } from "./workspace-editor"
import { ReminderEditor } from "./reminder-editor"
import { deleteBlobs, putBlob, useBlobUrl } from "@/lib/blobs"
import { compressImage } from "@/lib/image"
import {
  NOTE_COLORS,
  PRIORITIES,
  PRIORITY_VISUAL,
  STATUSES,
  STATUS_VISUAL,
  isNoteEmpty,
  newId,
  type Attachment,
  type Note,
  type NoteColor,
  type Priority,
  type Reminder,
  type Status,
} from "@/lib/types"

export type DialogTarget = { note?: Note; status?: Status; deadline?: string; workspaceId?: string } | null

function Field({
  label,
  icon,
  className,
  children,
}: {
  label: string
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="[&>svg]:size-3.5 [&>svg]:text-muted-foreground">
        {icon} {label}
      </Label>
      {children}
    </div>
  )
}

const MAX_FILE = 20 * 1024 * 1024

function AttachmentThumb({
  a,
  pending,
  onRemove,
}: {
  a: Attachment
  pending?: File
  onRemove: () => void
}) {
  const url = useBlobUrl(a.id, pending)
  return (
    <div className="group relative size-20 overflow-hidden rounded-lg border bg-muted">
      {a.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        url && <img src={url} alt={a.name} className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 p-1 text-center">
          <FileText className="size-6 text-red-500" />
          <span dir="ltr" className="w-full truncate text-[10px]">{a.name}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="remove"
        className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 shadow"
      >
        <X className="size-3" />
      </button>
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
  const workspaces = useWorkspaces()
  const [workspaceId, setWorkspaceId] = React.useState<string | undefined>(n ? n.workspaceId : target.workspaceId)
  const [category, setCategory] = React.useState(n?.category ?? "")
  const [tags, setTags] = React.useState<string[]>(n?.tags ?? [])
  const [tagInput, setTagInput] = React.useState("")
  const [priority, setPriority] = React.useState<Priority | undefined>(n?.priority)
  const [deadline, setDeadline] = React.useState<string | undefined>(n?.deadline ?? target.deadline)
  const [reminders, setReminders] = React.useState<Reminder[]>(n?.reminders ?? [])
  const [remOpen, setRemOpen] = React.useState(reminders.length > 0) // hatirlatma bar bolsa échiq turidu
  const [status, setStatus] = React.useState<Status>(n?.status ?? target.status ?? "todo")
  const [color, setColor] = React.useState<NoteColor | undefined>(n?.color)
  const [links, setLinks] = React.useState(n?.links ?? [])
  const [checklist, setChecklist] = React.useState(n?.checklist ?? [])
  const [attachments, setAttachments] = React.useState<Attachment[]>(n?.attachments ?? [])
  const [pending, setPending] = React.useState<Record<string, File>>({})
  const [newCategory, setNewCategory] = React.useState("")
  const [calOpen, setCalOpen] = React.useState(false)

  // Workspace tallanghan bolsa, aldi bilen shu workspace'te ishlitilgen kategoriyeler tewsiye qilinidu (yoq bolsa hemmisi).
  const categories = React.useMemo(() => {
    const uniq = (list: Note[]) => Array.from(new Set(list.map((x) => x.category).filter(Boolean) as string[])).sort()
    const inWs = workspaceId ? uniq(notes.filter((x) => x.workspaceId === workspaceId)) : []
    return inWs.length ? inWs : uniq(notes)
  }, [notes, workspaceId])

  // Bar kategoriyeler + hazir tallanghan (téxi saqlanmighan yéngi) kategoriye.
  const categoryOptions = React.useMemo(
    () => (category && !categories.includes(category) ? [...categories, category] : categories),
    [categories, category]
  )

  function commitCategory() {
    const v = newCategory.trim()
    if (!v) return
    setCategory(v)
    setNewCategory("")
  }

  function commitTag() {
    const v = tagInput.trim().replace(/^#+/, "")
    if (v && !tags.includes(v)) setTags([...tags, v])
    setTagInput("")
  }

  async function addFiles(list: File[]) {
    const added: Attachment[] = []
    const files: Record<string, File> = {}
    for (const f0 of list) {
      const kind = f0.type.startsWith("image/") ? "image" : f0.type === "application/pdf" ? "pdf" : null
      if (!kind) { toast.error(t.form.fileBadType); continue }
      if (f0.size > MAX_FILE) { toast.error(t.form.fileTooBig); continue }
      const f = kind === "image" ? await compressImage(f0) : f0
      const id = newId()
      added.push({ id, kind, name: f.name, size: f.size, type: f.type })
      files[id] = f
    }
    setAttachments((cur) => [...cur, ...added])
    setPending((cur) => ({ ...cur, ...files }))
  }

  function removeAttachment(id: string) {
    setAttachments((cur) => cur.filter((a) => a.id !== id))
    setPending((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => k !== id)))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const pendingTag = tagInput.trim().replace(/^#+/, "")
    const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag] : tags
    const data: Partial<Note> = {
      title: title.trim() || undefined,
      content: content.trim() || undefined,
      category: category.trim() || undefined,
      workspaceId,
      tags: finalTags,
      priority,
      deadline,
      reminders: reminders.length ? reminders : undefined,
      status,
      color,
      links: links.filter((l) => l.url.trim()),
      checklist: checklist.filter((c) => c.text.trim()),
      attachments,
    }
    if (isNoteEmpty(data)) {
      toast.error(t.form.empty)
      return
    }
    try {
      await Promise.all(attachments.filter((a) => pending[a.id]).map((a) => putBlob(a.id, pending[a.id])))
    } catch {
      toast.error(t.form.fileBadType)
      return
    }
    const keep = new Set(attachments.map((a) => a.id))
    deleteBlobs((n?.attachments ?? []).filter((a) => !keep.has(a.id)).map((a) => a.id))
    if (n) update(n.id, data)
    else add(data)
    toast.success(t.form.saved)
    onClose()
  }

  return (
    <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <Field label={t.form.title} icon={<Type />}>
          <Input value={title} onChange={(e) => setTitle(ug(e.target.value))} autoFocus />
        </Field>
        <Field label={t.form.content} icon={<AlignLeft />}>
          <RichTextarea value={content} onChange={setContent} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.form.workspace} icon={<Layers />} className="sm:col-span-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {workspaces.length === 0 && (
                <span className="text-xs text-muted-foreground">{t.form.noWorkspaces}</span>
              )}
              {workspaces.map((w) => {
                const active = workspaceId === w.id
                return (
                  <span key={w.id} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setWorkspaceId(active ? undefined : w.id)}
                      className={cn(
                        `note-${w.color ?? "blue"} inline-flex h-7 items-center gap-1.5 rounded-full border border-(--note-chip) px-2.5 text-xs font-medium transition-colors`,
                        active ? "bg-(--note-chip)" : "bg-(--note-bg)/40"
                      )}
                    >
                      <span aria-hidden>{w.emoji ?? "📁"}</span> <span dir="auto">{w.name}</span>
                    </button>
                    {active && (
                      <WorkspaceEditor
                        workspace={w}
                        onDeleted={() => setWorkspaceId(undefined)}
                      />
                    )}
                  </span>
                )
              })}
              <WorkspaceEditor onSaved={(w) => setWorkspaceId(w.id)} />
            </div>
          </Field>
          <Field label={t.form.category} icon={<Folder />} className="sm:col-span-2">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.length === 0 && (
                  <span className="text-xs text-muted-foreground">{t.form.noCategories}</span>
                )}
                {categoryOptions.map((c) => {
                  const active = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(active ? "" : c)}
                      className={cn(
                        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
                        active ? "border-foreground/30 bg-secondary ring-1 ring-foreground/20" : "bg-background hover:bg-muted"
                      )}
                    >
                      {active ? <Check className="size-3" /> : <Folder className="size-3" />} {c}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newCategory}
                  placeholder={t.form.categoryNew}
                  onChange={(e) => setNewCategory(ug(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitCategory()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={commitCategory} disabled={!newCategory.trim()}>
                  <Plus /> {t.form.categoryAdd}
                </Button>
              </div>
            </div>
          </Field>
          <Field label={t.status} icon={<Activity />} className="sm:col-span-2">
            <div role="radiogroup" aria-label={t.status} className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const active = status === s
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg border px-3 text-sm whitespace-nowrap transition-colors",
                      active ? "border-foreground/30 bg-secondary font-medium ring-1 ring-foreground/20" : "bg-background hover:bg-muted"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        active ? "border-foreground" : "border-foreground/30"
                      )}
                    >
                      {active && <span className="size-2 rounded-full bg-foreground" />}
                    </span>
                    <span aria-hidden>{STATUS_VISUAL[s].icon}</span>
                    <span>{t.statuses[s]}</span>
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label={t.priority} icon={<Flag />}>
            <Select
              value={priority ?? "none"}
              onValueChange={(v) => setPriority(v === "none" ? undefined : (v as Priority))}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => (v === "none" ? t.form.none : `${PRIORITY_VISUAL[v as Priority].icon} ${t.priorities[v as Priority]}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.form.none}</SelectItem>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>{PRIORITY_VISUAL[p].icon} {t.priorities[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t.form.deadline} icon={<CalendarDays />}>
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

        <Field label={t.form.tags} icon={<Hash />}>
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

        <Field label={t.form.color} icon={<Palette />}>
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

        <Field label={t.form.links} icon={<Link2 />}>
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

        <Field label={t.form.attachments} icon={<Paperclip />}>
          <div className="space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((a) => (
                  <AttachmentThumb key={a.id} a={a} pending={pending[a.id]} onRemove={() => removeAttachment(a.id)} />
                ))}
              </div>
            )}
            <label className="inline-flex">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []))
                  e.target.value = ""
                }}
              />
              <span className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted">
                <Plus className="size-4" /> {t.form.addFiles}
              </span>
            </label>
          </div>
        </Field>

        <Field label={t.form.checklist} icon={<CheckSquare />}>
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

        <section className="rounded-xl border bg-muted/30">
          <button
            type="button"
            onClick={() => setRemOpen((o) => !o)}
            aria-expanded={remOpen}
            aria-controls="note-reminders"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted/60"
          >
            <Bell className="size-4 text-muted-foreground" aria-hidden />
            {t.alarm.label}
            {reminders.length > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs tabular-nums text-primary">{reminders.length}</span>
            )}
            <ChevronDown className={cn("ms-auto size-4 text-muted-foreground transition-transform", remOpen && "rotate-180")} aria-hidden />
          </button>
          {remOpen && (
            <div id="note-reminders" className="border-t px-3 pt-2.5 pb-3">
              <ReminderEditor value={reminders} onChange={setReminders} deadline={deadline} />
            </div>
          )}
        </section>
      </div>

      <div className="flex shrink-0 justify-end gap-2.5 border-t bg-muted/60 px-5 py-4 max-sm:[&>button]:flex-1">
        <Button type="submit" className={panelBtn}>{t.form.save}</Button>
        <Button type="button" variant="outline" className={panelBtn} onClick={onClose}>{t.form.cancel}</Button>
      </div>
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
  // Panel yépilish animatsiyesi waqtida form birdinla yoqap ketmisun
  const [kept, setKept] = React.useState<DialogTarget>(target)
  if (target && target !== kept) setKept(target)
  const shown = target ?? kept

  return (
    <SidePanel
      open={!!target}
      onOpenChange={(o) => !o && onClose()}
      title={shown?.note ? t.editNote : t.newNote}
      scroll={false}
    >
      {shown && (
        <NoteForm key={shown.note?.id ?? `new-${shown.status ?? ""}-${shown.deadline ?? ""}`} target={shown} onClose={onClose} />
      )}
    </SidePanel>
  )
}
