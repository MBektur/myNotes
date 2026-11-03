"use client"

import { SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { t } from "@/lib/i18n"
import type { Filters, SortBy } from "@/lib/filters"
import { PRIORITIES, STATUSES, type Note, type Priority, type Status } from "@/lib/types"

const ALL = "all"

function Pick({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: { value: string; label: string }[]
}) {
  const labels = new Map(options.map((o) => [o.value, o.label]))
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : (v as string))}>
        <SelectTrigger className="w-full" size="sm">
          <SelectValue>{(v: string) => (v === ALL ? t.all : labels.get(v) ?? v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t.all}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function FiltersPopover({
  notes,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  activeCount,
}: {
  notes: Note[]
  filters: Filters
  setFilters: (f: Filters) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  activeCount: number
}) {
  const categories = Array.from(new Set(notes.map((n) => n.category).filter(Boolean) as string[])).sort()
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort()
  const sortLabels = Object.entries(t.sort).map(([value, label]) => ({ value, label }))

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal /> {t.filters}
        {activeCount > 0 && <Badge className="ms-1 px-1.5">{activeCount}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[70vh] w-72 space-y-3 overflow-y-auto">
        <Pick
          label={t.status}
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v as Status | undefined })}
          options={STATUSES.map((s) => ({ value: s, label: t.statuses[s] }))}
        />
        <Pick
          label={t.form.category}
          value={filters.category}
          onChange={(v) => setFilters({ ...filters, category: v })}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
        <Pick
          label={t.priority}
          value={filters.priority}
          onChange={(v) => setFilters({ ...filters, priority: v as Priority | undefined })}
          options={PRIORITIES.map((p) => ({ value: p, label: t.priorities[p] }))}
        />
        <Pick
          label={t.form.deadline}
          value={filters.deadline}
          onChange={(v) => setFilters({ ...filters, deadline: v as Filters["deadline"] })}
          options={Object.entries(t.deadlineFilter).map(([value, label]) => ({ value, label }))}
        />
        {allTags.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">{t.form.tags}</Label>
            <div className="flex flex-wrap gap-1">
              {allTags.map((tag) => {
                const on = filters.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        tags: on ? filters.tags.filter((x) => x !== tag) : [...filters.tags, tag],
                      })
                    }
                  >
                    <Badge variant={on ? "default" : "secondary"}>#{tag}</Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <Pick
          label={t.sortBy}
          value={sortBy}
          onChange={(v) => setSortBy((v ?? "updated") as SortBy)}
          options={sortLabels}
        />
      </PopoverContent>
    </Popover>
  )
}
