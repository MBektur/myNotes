"use client"

import * as React from "react"
import { format, differenceInCalendarDays, parseISO } from "date-fns"
import { Activity, AlignLeft, CalendarDays, CheckSquare, Flag, Hash, ExternalLink, FileText, Folder, ImageIcon, Link2, Palette, Pencil, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { SidePanel, panelBtn } from "@/components/ui/side-panel"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { useBlobUrl } from "@/lib/blobs"
import { isOverdue } from "@/lib/filters"
import { useNotes } from "@/lib/notes-store"
import { PRIORITY_VISUAL, STATUS_VISUAL, noteColor, type Attachment, type Note } from "@/lib/types"
import { priorityStyle } from "./note-card"

function Section({
  title, icon, count, children,
}: { title: string; icon: React.ReactNode; count?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-2 text-[15px] font-semibold text-foreground/80 [&>svg]:size-4">
        {icon} {title}
        {count !== undefined && <span className="ms-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-foreground/70">{count}</span>}
      </h4>
      {children}
    </section>
  )
}

/** خاسلىق قۇرى: سول تەرەپتە ئىكون + ماۋزۇ، ئوڭ تەرەپتە قىممەت */
function Prop({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3 px-3.5 py-2.5">
      <dt className="flex items-center gap-1.5 text-sm text-foreground/65 [&>svg]:size-4 [&>svg]:shrink-0">
        {icon} {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5 text-[15px]">{children}</dd>
    </div>
  )
}

const fmtDateTime = (iso: string) => {
  try { return format(parseISO(iso), "yyyy-MM-dd HH:mm") } catch { return iso }
}

type Og = { url: string; title?: string; description?: string; image?: string; siteName?: string }
const ogCache = new Map<string, Og | null>()

function LinkPreview({ href, label }: { href: string; label?: string }) {
  const [og, setOg] = React.useState<Og | null | undefined>(ogCache.get(href))
  React.useEffect(() => {
    if (ogCache.has(href)) return
    let off = false
    fetch(`/api/og?url=${encodeURIComponent(href)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Og>) : null))
      .catch(() => null)
      .then((d) => {
        ogCache.set(href, d)
        if (!off) setOg(d)
      })
    return () => { off = true }
  }, [href])

  const hasPreview = og && (og.title || og.image)
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-stretch gap-3 overflow-hidden rounded-xl border bg-background p-2 transition-colors hover:bg-muted/50"
    >
      {hasPreview && og.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={og.image}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          className="size-20 shrink-0 rounded-lg bg-muted object-cover sm:size-24"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {hasPreview ? (
          <>
            {og.title && <div className="line-clamp-2 text-sm font-medium">{og.title}</div>}
            {og.description && <div className="line-clamp-2 text-[13px] text-muted-foreground">{og.description}</div>}
          </>
        ) : label ? (
          <div className="text-sm font-medium">{label}</div>
        ) : null}
        <div dir="ltr" className="flex items-center gap-1 text-xs text-primary">
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">{og?.siteName ?? href}</span>
        </div>
      </div>
    </a>
  )
}

/** Resim/PDF'ni sehipidin chiqmay, modal oyna ichide körsitidu. */
function AttachmentViewer({
  a, url, open, onOpenChange,
}: { a: Attachment; url: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <DialogTitle dir="ltr" className="min-w-0 flex-1 truncate text-start text-sm font-medium">{a.name}</DialogTitle>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="size-3.5" /> {t.detail.openFile}
          </a>
          <DialogClose render={<Button variant="ghost" size="icon" className="rounded-full" aria-label={t.detail.close} />}>
            <X />
          </DialogClose>
        </header>
        <div className="min-h-0 flex-1 bg-muted/40">
          {a.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={a.name} className="size-full object-contain" />
          ) : (
            <iframe src={url} title={a.name} className="size-full border-0 bg-white" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ImageItem({ a }: { a: Attachment }) {
  const url = useBlobUrl(a.id)
  const [open, setOpen] = React.useState(false)
  if (!url) return <div className="aspect-video animate-pulse rounded-lg bg-muted" />
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={a.name} className="block w-full cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={a.name} className="aspect-video w-full rounded-lg border object-cover" />
      </button>
      <AttachmentViewer a={a} url={url} open={open} onOpenChange={setOpen} />
    </>
  )
}

function PdfItem({ a }: { a: Attachment }) {
  const url = useBlobUrl(a.id)
  const [open, setOpen] = React.useState(false)
  const kb = Math.max(1, Math.round(a.size / 1024))
  return (
    <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-white/50 p-2 dark:bg-white/10">
      <FileText className="size-5 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <div dir="ltr" className="truncate text-sm text-start">{a.name}</div>
        <div className="text-[13px] text-foreground/60">{kb} KB</div>
      </div>
      {url && (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            <ExternalLink className="size-3.5" /> {t.detail.openFile}
          </button>
          <AttachmentViewer a={a} url={url} open={open} onOpenChange={setOpen} />
        </>
      )}
    </div>
  )
}

function Detail({ note }: { note: Note }) {
  const { toggleChecklist } = useNotes()
  const images = (note.attachments ?? []).filter((a) => a.kind === "image")
  const pdfs = (note.attachments ?? []).filter((a) => a.kind === "pdf")
  const done = note.checklist.filter((c) => c.done).length
  const total = note.checklist.length
  const overdue = isOverdue(note)
  const left = note.deadline ? differenceInCalendarDays(parseISO(note.deadline), new Date()) : null
  const rel =
    left === null || note.status === "done" ? null : left === 0 ? t.today : left > 0 ? t.detail.daysLeft(left) : t.detail.daysAgo(-left)
  const sv = STATUS_VISUAL[note.status]

  return (
    <div className="min-h-full space-y-5 bg-muted/30 px-5 py-5 text-foreground">
      <dl className="divide-y overflow-hidden rounded-2xl border bg-background shadow-xs">
        <Prop label={t.status} icon={<Activity />}>
          <span className={cn(`note-${sv.color} note-surface inline-flex items-center gap-1 rounded-full border border-foreground/10 px-3 py-1 text-[13px] font-medium`)}>
            <span aria-hidden>{sv.icon}</span> {t.statuses[note.status]}
          </span>
        </Prop>
        {note.priority && (
          <Prop label={t.priority} icon={<Flag />}>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium", priorityStyle[note.priority])}>
              <span aria-hidden>{PRIORITY_VISUAL[note.priority].icon}</span> {t.priorities[note.priority]}
            </span>
          </Prop>
        )}
        {note.deadline && (
          <Prop label={t.form.deadline} icon={<CalendarDays />}>
            <span className={cn("tabular-nums", overdue ? "font-medium text-red-600 dark:text-red-400" : "text-foreground/80")}>{note.deadline}</span>
            {rel && (
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", overdue ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-muted text-foreground/70")}>
                {rel}
              </span>
            )}
          </Prop>
        )}
        {note.category && (
          <Prop label={t.form.category} icon={<Folder />}>
            <Badge variant="secondary">{note.category}</Badge>
          </Prop>
        )}
        {note.tags.length > 0 && (
          <Prop label={t.form.tags} icon={<Hash />}>
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary">#{tag}</Badge>
            ))}
          </Prop>
        )}
        <Prop label={t.form.color} icon={<Palette />}>
          <span className={cn(`note-${noteColor(note)} note-surface size-5 rounded-full border border-foreground/20 shadow-sm`)} title={noteColor(note)} />
        </Prop>
      </dl>

      {note.content && (
        <Section title={t.form.content} icon={<AlignLeft />}>
          <div className="rounded-2xl border bg-background p-4 shadow-xs">
            <p className="text-sm leading-7 break-words whitespace-pre-line">{note.content}</p>
          </div>
        </Section>
      )}

      {total > 0 && (
        <Section title={t.detail.checklist} icon={<CheckSquare />} count={`${done}/${total}`}>
          <div className="space-y-3 rounded-2xl border bg-background p-4 shadow-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <ul className="space-y-2">
              {note.checklist.map((c) => (
                <li key={c.id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox checked={c.done} onCheckedChange={() => toggleChecklist(note.id, c.id)} />
                  <span className={cn("min-w-0 break-words", c.done && "text-foreground/50 line-through")}>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {images.length > 0 && (
        <Section title={t.detail.images} icon={<ImageIcon />} count={images.length}>
          <div className="grid grid-cols-2 gap-2">
            {images.map((a) => <ImageItem key={a.id} a={a} />)}
          </div>
        </Section>
      )}

      {pdfs.length > 0 && (
        <Section title={t.detail.pdfs} icon={<FileText />} count={pdfs.length}>
          <div className="space-y-2">
            {pdfs.map((a) => <PdfItem key={a.id} a={a} />)}
          </div>
        </Section>
      )}

      {note.links.length > 0 && (
        <Section title={t.detail.links} icon={<Link2 />} count={note.links.length}>
          <div className="space-y-2">
            {note.links.map((l) => (
              <LinkPreview
                key={l.id}
                label={l.label}
                href={/^[a-z][a-z0-9+.-]*:/i.test(l.url) ? l.url : `https://${l.url}`}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

export function NoteDetailPanel({
  note,
  onClose,
  onEdit,
  onDelete,
}: {
  note: Note | null
  onClose: () => void
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
}) {
  // Canlı xatirini al (checklist özgirishi qatarliq yéngilinishlar üchün).
  const { notes } = useNotes()
  const live = note ? notes.find((n) => n.id === note.id) ?? null : null
  // Panel yépilish animatsiyesi waqtida mezmun birdinla yoqap ketmisun
  const [kept, setKept] = React.useState<Note | null>(live)
  if (live && live !== kept) setKept(live)
  const shown = live ?? kept
  const sv = shown ? STATUS_VISUAL[shown.status] : null

  return (
    <SidePanel
      open={!!live}
      onOpenChange={(o) => !o && onClose()}
      headerClassName={shown ? `note-${noteColor(shown)} note-surface` : undefined}
      badges={
        shown &&
        sv && (
          <>
            <span className={cn(`note-${sv.color} rounded-full border border-foreground/15 bg-white/60 px-3 py-1 text-[13px] font-medium dark:bg-white/10`)}>
              <span aria-hidden>{sv.icon}</span> {t.statuses[shown.status]}
            </span>
            {shown.priority && (
              <span className={cn("rounded-full px-3 py-1 text-[13px] font-medium", priorityStyle[shown.priority])}>
                {PRIORITY_VISUAL[shown.priority].icon} {t.priorities[shown.priority]}
              </span>
            )}
            {isOverdue(shown) && (
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-[13px] font-medium text-red-600 dark:text-red-400">
                {t.deadlineFilter.overdue}
              </span>
            )}
          </>
        )
      }
      title={shown ? shown.title || (shown.content ? shown.content.slice(0, 60) : t.untitled) : null}
      description={
        shown && (
          <span className="tabular-nums">
            {t.detail.created} {fmtDateTime(shown.createdAt)}
            {shown.updatedAt !== shown.createdAt && <> · {t.detail.updated} {fmtDateTime(shown.updatedAt)}</>}
          </span>
        )
      }
      footer={
        shown && (
          <>
            <Button type="button" variant="ghost" className={cn(panelBtn, "me-auto text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400")} onClick={() => onDelete(shown)}>
              <Trash2 /> {t.actions.delete}
            </Button>
            <Button type="button" className={panelBtn} onClick={() => onEdit(shown)}>
              <Pencil /> {t.actions.edit}
            </Button>
            <Button type="button" variant="outline" className={panelBtn} onClick={onClose}>
              <X /> {t.detail.close}
            </Button>
          </>
        )
      }
    >
      {shown && <Detail note={shown} />}
    </SidePanel>
  )
}
