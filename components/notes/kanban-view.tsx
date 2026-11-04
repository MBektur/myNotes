"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import { STATUSES, STATUS_VISUAL, type Note, type Status } from "@/lib/types"
import { NoteCard } from "./note-card"

type Handlers = {
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
  onAdd: (s: Status) => void
}

function SortableCard({ note, onEdit, onDelete }: { note: Note } & Pick<Handlers, "onEdit" | "onDelete">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
        transition,
      }}
      className={cn("touch-manipulation", isDragging && "opacity-30")}
    >
      <NoteCard note={note} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function Column({
  status,
  notes,
  highlight,
  ...h
}: { status: Status; notes: Note[]; highlight: boolean } & Handlers) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[calc(100dvh-14rem)] w-[85vw] max-w-sm shrink-0 snap-center flex-col rounded-2xl bg-muted/60 p-2 transition-colors sm:w-72 lg:w-auto lg:max-w-none lg:min-w-0 lg:flex-1",
        (isOver || highlight) && "bg-muted ring-2 ring-primary/30"
      )}
    >
      <header className="flex items-center justify-between px-2 py-1.5">
        <h2 className="flex items-center gap-2 text-xl font-regular">
          <span
            aria-hidden
            className={`note-${STATUS_VISUAL[status].color} size-3 shrink-0 rounded-full border border-foreground/20 bg-(--note-chip)`}
          />
          <span aria-hidden>{STATUS_VISUAL[status].icon}</span>
          {t.statuses[status]}
          <span className="font-normal text-muted-foreground">{notes.length}</span>
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={() => h.onAdd(status)} aria-label={t.newNote}>
          <Plus />
        </Button>
      </header>
      <div className="flex min-h-24 flex-col gap-2">
        <SortableContext items={notes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          {notes.map((n) => (
            <SortableCard key={n.id} note={n} onEdit={h.onEdit} onDelete={h.onDelete} />
          ))}
        </SortableContext>
      </div>
    </section>
  )
}

const isStatus = (id: string): id is Status => (STATUSES as readonly string[]).includes(id)

/** Chashqan turghan karta (bolmisa kolonka) ustunlik bérilidu: kolonning ichidiki orunni anglash üchün */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length) {
    const cards = hits.filter((c) => !isStatus(String(c.id)))
    return cards.length ? cards : hits
  }
  return rectIntersection(args)
}

export function KanbanView({ notes, onReorder, ...h }: { notes: Note[]; onReorder?: () => void } & Handlers) {
  const { reorder } = useNotes()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [overStatus, setOverStatus] = React.useState<Status | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )
  const active = notes.find((n) => n.id === activeId)

  const columns = () =>
    Object.fromEntries(STATUSES.map((s) => [s, notes.filter((n) => n.status === s).map((n) => n.id)])) as Record<Status, string[]>
  const statusOf = (id: string, cols: Record<Status, string[]>) =>
    isStatus(id) ? id : STATUSES.find((s) => cols[s].includes(id)) ?? null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }
  function onDragOver(e: DragOverEvent) {
    setOverStatus(e.over ? statusOf(String(e.over.id), columns()) : null)
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    setOverStatus(null)
    const { active: a, over } = e
    if (!over) return
    const id = String(a.id)
    const overId = String(over.id)
    const cols = columns()
    const from = statusOf(id, cols)
    const to = statusOf(overId, cols)
    if (!from || !to) return

    if (from === to) {
      if (isStatus(overId)) {
        // Kolonning özige (karta emes) tashlansa: axirigha
        cols[to] = [...cols[to].filter((x) => x !== id), id]
      } else {
        const oldI = cols[from].indexOf(id)
        const newI = cols[from].indexOf(overId)
        if (oldI === newI) return
        cols[from] = arrayMove(cols[from], oldI, newI)
      }
    } else {
      cols[from] = cols[from].filter((x) => x !== id)
      let idx = cols[to].length
      if (!isStatus(overId)) {
        idx = cols[to].indexOf(overId)
        // Karta ottursidin töwen teripige tashlansa, uning kéyinige
        const moved = a.rect.current.translated
        if (moved && moved.top + moved.height / 2 > over.rect.top + over.rect.height / 2) idx += 1
      }
      cols[to].splice(idx, 0, id)
    }

    let order = 0
    const items = STATUSES.flatMap((s) => cols[s].map((nid) => ({ id: nid, status: s, order: order++ })))
    reorder(items)
    onReorder?.()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setOverStatus(null)
      }}
    >
      <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
        {STATUSES.map((s) => (
          <Column key={s} status={s} notes={notes.filter((n) => n.status === s)} highlight={overStatus === s && !!activeId} {...h} />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <NoteCard note={active} onEdit={() => { }} onDelete={() => { }} className="rotate-2 shadow-xl" />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
