"use client"

import { NotebookPen, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import { CardView } from "./card-view"
import { FilterBar } from "./filter-bar"
import { WorkspaceTabs } from "./workspace-tabs"
import { KanbanView } from "./kanban-view"
import { ListView } from "./list-view"
import { Toolbar } from "./toolbar"
import { useShell } from "./app-shell"

export function NotesPage() {
  const { notes, hydrated } = useNotes()
  const { filters, setFilters, sortBy, setSortBy, sortDir, setSortDir, view, setView, visible, edit, add, askDelete } = useShell()

  return (
    <>
      <Toolbar view={view} setView={setView} onNew={() => add()} />
      <WorkspaceTabs notes={notes} filters={filters} setFilters={setFilters} />
      <FilterBar
        notes={notes}
        filters={filters}
        setFilters={setFilters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortDir={sortDir}
        setSortDir={setSortDir}
      />

      {!hydrated ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : view === "kanban" ? (
        <KanbanView notes={visible} onEdit={edit} onDelete={askDelete} onAdd={add} onReorder={() => setSortBy("manual")} />
      ) : visible.length === 0 ? (
        <div className="clay flex flex-col items-center gap-2 py-16 text-center">
          <NotebookPen className="size-8 text-muted-foreground" />
          <p className="font-medium">{t.empty}</p>
          <p className="text-sm text-muted-foreground">{t.emptyHint}</p>
        </div>
      ) : view === "card" ? (
        <CardView notes={visible} onEdit={edit} onDelete={askDelete} onReorder={() => setSortBy("manual")} />
      ) : (
        <ListView notes={visible} onEdit={edit} onDelete={askDelete} />
      )}

      {/* Mobilde (<md) toolbar'daki "Yéngi xatire" yoshurun; shuning üchün alt gézish üstide ghulaq tügme */}
      <button
        type="button"
        onClick={() => add()}
        aria-label={t.newNote}
        className="fixed end-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-10 items-center justify-center rounded-full bg-pink-400 text-white shadow-[0_6px_12px_-4px_oklch(0.6_0.2_5/0.6),inset_0_2px_2px_oklch(1_0_0/0.4)] transition-transform active:scale-95 md:hidden"
      >
        <Plus className="size-5" />
      </button>
    </>
  )
}
