"use client"

import { KanbanSquare, LayoutGrid, List, Plus } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { t } from "@/lib/i18n"
import type { ViewMode } from "@/lib/types"

/** Peqet: bügün, körünüsh almashturush, yéngi xatire. (Süzgüch: filter-bar.tsx) */
export function Toolbar({
  view,
  setView,
  onNew,
}: {
  view: ViewMode
  setView: (v: ViewMode) => void
  onNew: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="me-auto text-sm text-muted-foreground">
        {t.today}: {format(new Date(), "yyyy-MM-dd")}
      </span>
      <ToggleGroup
        variant="outline"
        value={[view]}
        onValueChange={(v) => v[0] && setView(v[0] as ViewMode)}
        aria-label={t.switchView}
      >
        <ToggleGroupItem value="kanban" aria-label={t.view.kanban}><KanbanSquare /></ToggleGroupItem>
        <ToggleGroupItem value="card" aria-label={t.view.card}><LayoutGrid /></ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label={t.view.list}><List /></ToggleGroupItem>
      </ToggleGroup>
      <Button onClick={onNew} className="max-md:hidden">
        <Plus /> {t.newNote}
      </Button>
    </div>
  )
}
