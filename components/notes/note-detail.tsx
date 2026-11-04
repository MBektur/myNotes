"use client"

import * as React from "react"
import { Activity, AlignLeft, CalendarDays, CheckSquare, Flag, Hash, ExternalLink, FileText, Folder, ImageIcon, Link2, Pencil, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SidePanel } from "@/components/ui/side-panel"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { useBlobUrl } from "@/lib/blobs"
import { isOverdue } from "@/lib/filters"
import { useNotes } from "@/lib/notes-store"
import { PRIORITY_VISUAL, STATUS_VISUAL, noteColor, type Attachment, type Note } from "@/lib/types"
import { priorityStyle } from "./note-card"

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-medium text-foreground/60 [&>svg]:size-3.5">
        {icon} {title}
      </h4>
      {children}
    </section>
  )
}

function Row({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <dt className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-foreground/60 [&>svg]:size-3.5">
        {icon} {label}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</dd>
    </div>
  )
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
            {og.description && <div className="line-clamp-2 text-xs text-muted-foreground">{og.description}</div>}
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

function ImageItem({ a }: { a: Attachment }) {
  const url = useBlobUrl(a.id)
  if (!url) return <div className="aspect-video animate-pulse rounded-lg bg-muted" />
  return (
    <a href={url} target="_blank" rel="noreferrer" title={a.name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={a.name} className="aspect-video w-full rounded-lg border object-cover" />
    </a>
  )
}

function PdfItem({ a }: { a: Attachment }) {
  const url = useBlobUrl(a.id)
  const kb = Math.max(1, Math.round(a.size / 1024))
  return (
    <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-white/50 p-2 dark:bg-white/10">
      <FileText className="size-5 shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <div dir="ltr" className="truncate text-sm text-start">{a.name}</div>
        <div className="text-xs text-foreground/60">{kb} KB</div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          <ExternalLink className="size-3.5" /> {t.detail.openFile}
        </a>
      )}
    </div>
  )
}

function Detail({ note }: { note: Note }) {
  const { toggleChecklist } = useNotes()
  const images = (note.attachments ?? []).filter((a) => a.kind === "image")
  const pdfs = (note.attachments ?? []).filter((a) => a.kind === "pdf")
  return (
    <div className="space-y-4 px-5 py-4 text-foreground">
      <dl className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Row label={t.status} icon={<Activity />}>
            <Badge variant="secondary">
              <span aria-hidden>{STATUS_VISUAL[note.status].icon}</span> {t.statuses[note.status]}
            </Badge>
          </Row>
          {note.category && (
            <Row label={t.form.category} icon={<Folder />}>
              <Badge variant="secondary">{note.category}</Badge>
            </Row>
          )}
        </div>
        {note.tags.length > 0 && (
          <Row label={t.form.tags} icon={<Hash />}>
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary">#{tag}</Badge>
            ))}
          </Row>
        )}
        {note.priority && (
          <Row label={t.priority} icon={<Flag />}>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", priorityStyle[note.priority])}>
              <span aria-hidden>{PRIORITY_VISUAL[note.priority].icon}</span> {t.priorities[note.priority]}
            </span>
          </Row>
        )}
        {note.deadline && (
          <Row label={t.form.deadline} icon={<CalendarDays />}>
            <span
              className={cn(
                "text-sm",
                isOverdue(note) ? "font-medium text-red-600 dark:text-red-400" : "text-foreground/80"
              )}
            >
              {note.deadline}
            </span>
          </Row>
        )}
      </dl>

      {note.content && (
        <Section title={t.form.content} icon={<AlignLeft />}>
          <p className="text-sm leading-relaxed whitespace-pre-line">{note.content}</p>
        </Section>
      )}

      {images.length > 0 && (
        <Section title={t.detail.images} icon={<ImageIcon />}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((a) => <ImageItem key={a.id} a={a} />)}
          </div>
        </Section>
      )}

      {pdfs.length > 0 && (
        <Section title={t.detail.pdfs} icon={<FileText />}>
          <div className="space-y-2">
            {pdfs.map((a) => <PdfItem key={a.id} a={a} />)}
          </div>
        </Section>
      )}

      {note.links.length > 0 && (
        <Section title={t.detail.links} icon={<Link2 />}>
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

      {note.checklist.length > 0 && (
        <Section title={t.detail.checklist} icon={<CheckSquare />}>
          <ul className="space-y-1.5">
            {note.checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={c.done} onCheckedChange={() => toggleChecklist(note.id, c.id)} />
                <span className={cn(c.done && "text-foreground/50 line-through")}>{c.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

    </div>
  )
}

export function NoteDetailPanel({
  note,
  onClose,
  onEdit,
}: {
  note: Note | null
  onClose: () => void
  onEdit: (n: Note) => void
}) {
  // Canlı xatirini al (checklist özgirishi qatarliq yéngilinishlar üchün).
  const { notes } = useNotes()
  const live = note ? notes.find((n) => n.id === note.id) ?? null : null
  // Panel yépilish animatsiyesi waqtida mezmun birdinla yoqap ketmisun
  const [kept, setKept] = React.useState<Note | null>(live)
  if (live && live !== kept) setKept(live)
  const shown = live ?? kept

  return (
    <SidePanel
      open={!!live}
      onOpenChange={(o) => !o && onClose()}
      title={
        shown ? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              title={noteColor(shown)}
              className={cn(`note-${noteColor(shown)} note-surface size-4 shrink-0 rounded-full border border-foreground/20 shadow-sm`)}
            />
            {shown.title || (shown.content ? "" : t.untitled)}
          </span>
        ) : null
      }
      footer={
        shown && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(shown)}>
              <Pencil /> {t.actions.edit}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
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
