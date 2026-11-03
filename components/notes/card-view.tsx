"use client"

import type { Note } from "@/lib/types"
import { NoteCard } from "./note-card"

export function CardView({
  notes,
  onEdit,
  onDelete,
}: {
  notes: Note[]
  onEdit: (n: Note) => void
  onDelete: (n: Note) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
