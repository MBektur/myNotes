"use client"

import * as React from "react"
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import { useNotes } from "@/lib/notes-store"
import type { Note } from "@/lib/types"
import { NoteCard } from "./note-card"

function SortableCard({ note, onEdit, onDelete }: { note: Note; onEdit: (n: Note) => void; onDelete: (n: Note) => void }) {
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

export function CardView({
  notes,
  onEdit,
  onDelete,
  onReorder,
}: {
  notes: Note[]
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
  onReorder?: () => void
}) {
  const { reorder } = useNotes()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  )
  const active = notes.find((n) => n.id === activeId)

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!e.over || e.active.id === e.over.id) return
    const ids = notes.map((n) => n.id)
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)))
    const byId = new Map(notes.map((n) => [n.id, n]))
    reorder(next.map((id, order) => ({ id, status: byId.get(id)!.status, order })))
    onReorder?.()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {notes.map((n) => (
            <SortableCard key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {active ? <NoteCard note={active} onEdit={() => {}} onDelete={() => {}} className="rotate-2 shadow-xl" /> : null}
      </DragOverlay>
    </DndContext>
  )
}
