"use client"

import { KanbanSquare, LayoutGrid, List, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { t } from "@/lib/i18n"
import { emptyFilters, hasActiveFilters, type Filters, type SortBy } from "@/lib/filters"
import type { Note, ViewMode } from "@/lib/types"
import { FiltersPopover } from "./filters-popover"

export function Toolbar({
  notes,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  view,
  setView,
  onNew,
}: {
  notes: Note[]
  filters: Filters
  setFilters: (f: Filters) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  view: ViewMode
  setView: (v: ViewMode) => void
  onNew: () => void
}) {
  const chips: { key: string; label: string; clear: () => void }[] = []
  if (filters.query) chips.push({ key: "q", label: `"${filters.query}"`, clear: () => setFilters({ ...filters, query: "" }) })
  if (filters.status) chips.push({ key: "s", label: t.statuses[filters.status], clear: () => setFilters({ ...filters, status: undefined }) })
  if (filters.category) chips.push({ key: "c", label: filters.category, clear: () => setFilters({ ...filters, category: undefined }) })
  if (filters.priority) chips.push({ key: "p", label: t.priorities[filters.priority], clear: () => setFilters({ ...filters, priority: undefined }) })
  if (filters.deadline) chips.push({ key: "d", label: t.deadlineFilter[filters.deadline], clear: () => setFilters({ ...filters, deadline: undefined }) })
  for (const tag of filters.tags)
    chips.push({ key: `t-${tag}`, label: `#${tag}`, clear: () => setFilters({ ...filters, tags: filters.tags.filter((x) => x !== tag) }) })

  return (
    <div className="space-y-2">
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
        <FiltersPopover
          notes={notes}
          filters={filters}
          setFilters={setFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          activeCount={chips.length}
        />
        <Button onClick={onNew}>
          <Plus /> {t.newNote}
        </Button>
      </div>
      {hasActiveFilters(filters) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1">
              {c.label}
              <button type="button" onClick={c.clear} aria-label="remove"><X className="size-3" /></button>
            </Badge>
          ))}
          <Button variant="ghost" size="xs" onClick={() => setFilters(emptyFilters)}>
            {t.clearFilters}
          </Button>
        </div>
      )}
    </div>
  )
}
