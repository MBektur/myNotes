"use client"

import { FilterX, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { emptyFilters, hasActiveFilters, type Filters, type SortBy } from "@/lib/filters"
import { MultiSelect, OptionLabel, type Option } from "./multi-select"
import {
  PRIORITIES,
  STATUSES,
  STATUS_VISUAL,
  colorForCategory,
  type Note,
  type NoteColor,
  type Priority,
  type Status,
} from "@/lib/types"

const PRIORITY_VISUAL: Record<Priority, { icon: string; color: NoteColor }> = {
  low: { icon: "🌱", color: "teal" },
  medium: { icon: "⚡", color: "blue" },
  high: { icon: "🔥", color: "orange" },
  urgent: { icon: "🚨", color: "pink" },
}
const DEADLINE_VISUAL: Record<string, { icon: string; color: NoteColor }> = {
  overdue: { icon: "⏰", color: "pink" },
  week: { icon: "📅", color: "orange" },
  none: { icon: "♾️", color: "teal" },
}
const SORT_ICON: Record<string, string> = {
  updated: "🕒", created: "🆕", deadline: "📅", priority: "🔥", title: "🔤",
}

const ALL = "all"

function Pick({
  label,
  value,
  onChange,
  options,
  allLabel = t.all,
  withAll = true,
}: {
  label: string
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: Option[]
  allLabel?: string
  withAll?: boolean
}) {
  const byValue = new Map(options.map((o) => [o.value, o]))
  return (
    <div className="min-w-0 space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? undefined : (v as string))}
      >
        <SelectTrigger className="w-full rounded-xl bg-background/60" size="sm">
          <SelectValue>
            {(v: string) => {
              const o = byValue.get(v)
              return v === ALL || !o ? (v === ALL ? allLabel : v) : <OptionLabel option={o} />
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {withAll && <SelectItem value={ALL}>{allLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}><OptionLabel option={o} /></SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Ayrim süzgüch (filter) taxtisi: Toolbar'dan ayrim, hemme süzgüch körünup turidu. */
export function FilterBar({
  notes,
  filters,
  setFilters,
  sortBy,
  setSortBy,
}: {
  notes: Note[]
  filters: Filters
  setFilters: (f: Filters) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
}) {
  const categories = Array.from(new Set(notes.map((n) => n.category).filter(Boolean) as string[])).sort()
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort()
  const active = hasActiveFilters(filters)

  return (
    <section className="clay space-y-3 p-4" aria-label={t.filters}>
      {active && (
        <div className="flex">
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="inline-flex items-center gap-1.5 rounded-full bg-pink-400 px-3 py-1 text-xs font-bold text-white shadow transition hover:bg-pink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400"
          >
            <FilterX className="size-3.5" /> {t.clearFilters}
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MultiSelect
          label={t.status}
          selected={filters.statuses}
          onChange={(v) => setFilters({ ...filters, statuses: v as Status[] })}
          options={STATUSES.map((s) => ({ value: s, label: t.statuses[s], ...STATUS_VISUAL[s] }))}
        />
        <MultiSelect
          label={t.form.category}
          selected={filters.categories}
          onChange={(v) => setFilters({ ...filters, categories: v })}
          options={categories.map((c) => ({ value: c, label: c, icon: "🏷️", color: colorForCategory(c) }))}
        />
        <MultiSelect
          label={t.priority}
          selected={filters.priorities}
          onChange={(v) => setFilters({ ...filters, priorities: v as Priority[] })}
          options={PRIORITIES.map((p) => ({ value: p, label: t.priorities[p], ...PRIORITY_VISUAL[p] }))}
        />
        <MultiSelect
          label={t.form.tags}
          selected={filters.tags}
          onChange={(v) => setFilters({ ...filters, tags: v })}
          options={allTags.map((tag) => ({ value: tag, label: `#${tag}` }))}
        />
        <Pick
          label={t.form.deadline}
          value={filters.deadline}
          onChange={(v) => setFilters({ ...filters, deadline: v as Filters["deadline"] })}
          options={Object.entries(t.deadlineFilter).map(([value, label]) => ({ value, label, ...DEADLINE_VISUAL[value] }))}
        />
        <Pick
          label={t.sortBy}
          value={sortBy}
          withAll={false}
          onChange={(v) => setSortBy((v ?? "updated") as SortBy)}
          options={Object.entries(t.sort).map(([value, label]) => ({ value, label, icon: SORT_ICON[value] }))}
        />
      </div>

    </section>
  )
}
