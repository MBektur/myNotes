"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import { STATUSES, type Note, type Status } from "@/lib/types"
import { NoteCard } from "./note-card"

type Handlers = {
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
  onAdd: (s: Status) => void
}

function DraggableCard({ note, onEdit, onDelete }: { note: Note } & Pick<Handlers, "onEdit" | "onDelete">) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: note.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-manipulation", isDragging && "opacity-30")}
    >
      <NoteCard note={note} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

function Column({
  status,
  notes,
  ...h
}: { status: Status; notes: Note[] } & Handlers) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-[85vw] max-w-sm shrink-0 snap-center flex-col rounded-2xl bg-muted/60 p-2 transition-colors sm:w-72 lg:w-auto lg:max-w-none lg:min-w-0 lg:flex-1",
        isOver && "bg-muted ring-2 ring-primary/30"
      )}
    >
      <header className="flex items-center justify-between px-2 py-1.5">
        <h2 className="text-sm font-semibold">
          {t.statuses[status]}{" "}
          <span className="font-normal text-muted-foreground">{notes.length}</span>
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={() => h.onAdd(status)} aria-label={t.newNote}>
          <Plus />
        </Button>
      </header>
      <div className="flex min-h-24 flex-col gap-2">
        {notes.map((n) => (
          <DraggableCard key={n.id} note={n} onEdit={h.onEdit} onDelete={h.onDelete} />
        ))}
      </div>
    </section>
  )
}

export function KanbanView({ notes, ...h }: { notes: Note[] } & Handlers) {
  const { move } = useNotes()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )
  const active = notes.find((n) => n.id === activeId)

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const to = e.over?.id as Status | undefined
    if (to && (STATUSES as readonly string[]).includes(to)) move(String(e.active.id), to)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
        {STATUSES.map((s) => (
          <Column key={s} status={s} notes={notes.filter((n) => n.status === s)} {...h} />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <NoteCard note={active} onEdit={() => {}} onDelete={() => {}} className="rotate-2 shadow-xl" />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
