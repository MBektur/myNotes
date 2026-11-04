"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Activity, AlignLeft, CalendarDays, CheckSquare, Flag, Hash, ExternalLink, FileText, Folder, ImageIcon, Link2, Pencil, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

function Detail({ note, onEdit, onClose }: { note: Note; onEdit: (n: Note) => void; onClose: () => void }) {
  const { toggleChecklist } = useNotes()
  const images = (note.attachments ?? []).filter((a) => a.kind === "image")
  const pdfs = (note.attachments ?? []).filter((a) => a.kind === "pdf")
  return (
    <>
    <div
      className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-foreground"
    >
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
    <div className="flex shrink-0 justify-end gap-2 rounded-b-xl border-t bg-muted/60 px-4 py-3">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(note)}>
        <Pencil /> {t.actions.edit}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onClose}>
        <X /> {t.detail.close}
      </Button>
    </div>
    </>
  )
}

export type Origin = { left: number; top: number; width: number; height: number }

const played = new WeakSet<Element>()

/** Kart bilen modalni baghlighan egri sizdiq (modalning arqisida, backdrop'ning üstide). */
function Connector({
  origin,
  offset,
  popup,
}: {
  origin: Origin
  offset: { x: number; y: number }
  popup: HTMLElement | null
}) {
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Modalning ölchimi (offsetWidth transform'ni hésaplimaydu, shunga animatsiye waqtida toghra).
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    if (!popup) return
    const update = () => setBox({ w: popup.offsetWidth, h: popup.offsetHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(popup)
    return () => ro.disconnect()
  }, [popup])

  const ready = size.w > 0 && box.w > 0
  const sx = origin.left + origin.width / 2
  const sy = origin.top + origin.height / 2
  // Egri modalning merkizige emes, kartqa qarighan *chétige* ulinidu: modal yötkelgende chét bilen birge qozghilidu.
  const mx = size.w / 2 + offset.x
  const my = size.h / 2 + offset.y
  const left = mx - box.w / 2
  const right = mx + box.w / 2
  const top = my - box.h / 2
  const bottom = my + box.h / 2
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const horizontal = Math.abs(mx - sx) >= Math.abs(my - sy)
  let d: string
  if (horizontal) {
    const ex = sx < mx ? left : right
    const ey = clamp(sy, top + 28, bottom - 28)
    d = `M ${sx} ${sy} C ${(sx + ex) / 2} ${sy}, ${(sx + ex) / 2} ${ey}, ${ex} ${ey}`
  } else {
    const ey = sy < my ? top : bottom
    const ex = clamp(sx, left + 28, right - 28)
    d = `M ${sx} ${sy} C ${sx} ${(sy + ey) / 2}, ${ex} ${(sy + ey) / 2}, ${ex} ${ey}`
  }

  if (!ready) return null
  return createPortal(
    <svg
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 z-[51] size-full")}
    >
      {/* Siziqning sirtqi hashiyesi (stroke) */}
      <path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth={10}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke="black"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx={sx} cy={sy} r={8} fill="black" stroke="white" strokeWidth={3} />
    </svg>,
    document.body
  )
}

/** Modal tiklanghan kartning ornidin chongiyip chiqqandek animatsiye (FLIP, bir tereplik scale: yazilar sozulmaydu). */
function playFromOrigin(el: HTMLElement, o: Origin) {
  if (played.has(el)) return
  played.add(el)
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height) return
  const dx = o.left + o.width / 2 - (r.left + r.width / 2)
  const dy = o.top + o.height / 2 - (r.top + r.height / 2)
  const scale = Math.min(1, Math.max(0.2, Math.min(o.width / r.width, o.height / r.height)))
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.3 },
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
    ],
    { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
  )
}

export function NoteDetailDialog({
  note,
  origin,
  onClose,
  onEdit,
}: {
  note: Note | null
  origin: Origin | null
  onClose: () => void
  onEdit: (n: Note) => void
}) {
  // Canlı xatirini al (checklist özgirishi qatarliq yéngilinishlar üchün).
  const { notes } = useNotes()
  const live = note ? notes.find((n) => n.id === note.id) ?? null : null
  const popupEl = React.useRef<HTMLDivElement | null>(null)
  const [popupNode, setPopupNode] = React.useState<HTMLDivElement | null>(null)
  const popupRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      popupEl.current = el
      setPopupNode(el)
      if (el && origin) playFromOrigin(el, origin)
    },
    [origin]
  )

  // Header'dan sörep modalni yötkesh (peqet chong ekranda).
  const [pos, setPos] = React.useState({ x: 0, y: 0 })
  const drag = React.useRef<{ sx: number; sy: number; ox: number; oy: number; rect: DOMRect } | null>(null)

  function onDragStart(e: React.PointerEvent<HTMLElement>) {
    const el = popupEl.current
    if (!el || e.button !== 0 || (e.target as Element).closest("button")) return
    if (!window.matchMedia("(min-width: 640px)").matches) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, rect: el.getBoundingClientRect() }
  }
  function onDragMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d) return
    // Tuggha basilmighan bolsa (pointerup yoqap ketken: ctrl+click, pencherdin chiqip qoyuwétish...) sörepni toxtat.
    if (!(e.buttons & 1)) {
      drag.current = null
      return
    }
    // Modal ekrandin chiqip ketmisun: header herqachan körünüp turidu.
    const minDx = 80 - d.rect.right
    const maxDx = window.innerWidth - 80 - d.rect.left
    const minDy = -d.rect.top
    const maxDy = window.innerHeight - 56 - d.rect.top
    setPos({
      x: d.ox + Math.min(maxDx, Math.max(minDx, e.clientX - d.sx)),
      y: d.oy + Math.min(maxDy, Math.max(minDy, e.clientY - d.sy)),
    })
  }
  function onDragEnd() {
    drag.current = null
  }
  return (
    <Dialog
      open={!!live}
      onOpenChange={(o) => !o && onClose()}
      onOpenChangeComplete={(o) => {
        if (!o) setPos({ x: 0, y: 0 })
      }}
    >
      {live && origin && <Connector origin={origin} offset={pos} popup={popupNode} />}
      <DialogContent
        ref={popupRef}
        style={{
          ...(origin ? { animation: "none" } : null),
          ...(pos.x || pos.y ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : null),
        }}
        dir="rtl"
        showCloseButton={false}
        className={cn(
          "z-[52] flex max-h-[100dvh] flex-col gap-0 p-0 max-sm:top-0 max-sm:left-0 max-sm:h-[100dvh] max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-h-[90vh] sm:max-w-xl"
        )}
      >
        <DialogHeader
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onLostPointerCapture={onDragEnd}
          onContextMenu={onDragEnd}
          className="shrink-0 touch-none rounded-t-xl bg-muted/60 flex-row items-center justify-between gap-2 border-b px-4 py-3 select-none sm:cursor-grab sm:active:cursor-grabbing"
        >
          <div className="flex min-w-0 items-center gap-2">
            {live && (
              <span
                aria-hidden
                title={noteColor(live)}
                className={cn(`note-${noteColor(live)} note-surface size-4 shrink-0 rounded-full border border-foreground/20 shadow-sm`)}
              />
            )}
            <DialogTitle className="text-base break-words">
              {live?.title || (live?.content ? "" : t.untitled)}
            </DialogTitle>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={t.detail.close}>
            <X />
          </Button>
        </DialogHeader>
        {live && <Detail note={live} onEdit={onEdit} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
