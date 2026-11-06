"use client"

import * as React from "react"
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  ArrowUpNarrowWide,
  CalendarClock,
  CircleDot,
  FilterX,
  Flame,
  Hash,
  Layers,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { emptyFilters, hasActiveFilters, type Filters, type SortBy, type SortDir } from "@/lib/filters"
import { useWorkspaces } from "@/lib/workspaces-store"
import { MultiSelect, OptionLabel, type Option } from "./multi-select"
import {
  PRIORITIES,
  STATUSES,
  STATUS_VISUAL,
  colorForCategory,
  PRIORITY_VISUAL,
  type Note,
  type NoteColor,
  type Priority,
  type Status,
} from "@/lib/types"

const DEADLINE_VISUAL: Record<string, { icon: string; color: NoteColor }> = {
  overdue: { icon: "⏰", color: "pink" },
  week: { icon: "📅", color: "orange" },
  none: { icon: "♾️", color: "teal" },
}
const SORT_ICON: Record<string, string> = {
  updated: "🕒", created: "🆕", deadline: "📅", priority: "🔥", title: "🔤", manual: "↕️",
}

const ALL = "all"

function Pick({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  allLabel = t.all,
  withAll = true,
  trailing,
}: {
  label: string
  /** Label aldidiki kichik ikon */
  icon?: LucideIcon
  value: string | undefined
  onChange: (v: string | undefined) => void
  options: Option[]
  allLabel?: string
  withAll?: boolean
  /** Select'ning yénida turidighan qoshumche kontrol (mesilen tertip yönilishi) */
  trailing?: React.ReactNode
}) {
  const byValue = new Map(options.map((o) => [o.value, o]))
  return (
    <div className="min-w-0 space-y-1">
      <Label className="gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
        {label}
      </Label>
      <div className="flex items-stretch gap-2">
      <Select
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? undefined : (v as string))}
      >
        <SelectTrigger className="w-full min-w-0 rounded-xl bg-background/60" size="sm">
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
      {trailing}
      </div>
    </div>
  )
}

/** Tertip yönilishi (ösüsh / kémeyish) tugmisi: select bilen birdek égizlik, chégra we burjek. */
function SortDirButton({
  dir,
  onChange,
  disabled,
}: {
  dir: SortDir
  onChange: (d: SortDir) => void
  disabled: boolean
}) {
  const Icon = dir === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow
  const label = dir === "asc" ? t.sortDir.asc : t.sortDir.desc
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(dir === "asc" ? "desc" : "asc")}
      aria-label={label}
      title={label}
      className="inline-flex w-8 shrink-0 items-center justify-center rounded-xl border border-input bg-background/60 text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 dark:bg-input/30 dark:hover:bg-input/50"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

/** Ayrim süzgüch (filter) taxtisi: Toolbar'dan ayrim, hemme süzgüch körünup turidu. */
export function FilterBar({
  notes,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  sortDir,
  setSortDir,
}: {
  notes: Note[]
  filters: Filters
  setFilters: (f: Filters) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  sortDir: SortDir
  setSortDir: (d: SortDir) => void
}) {
  const workspaces = useWorkspaces()
  // Workspace tallanghan bolsa, kategoriye / xeshtek tallashliri shu workspace'lerdiki xatirilardin chiqidu (tallanghanlar saqlinidu)
  const scoped = filters.workspaces.length
    ? notes.filter((n) => !!n.workspaceId && filters.workspaces.includes(n.workspaceId))
    : notes
  const categories = Array.from(
    new Set([...scoped.map((n) => n.category), ...filters.categories].filter(Boolean) as string[])
  ).sort()
  const allTags = Array.from(new Set([...scoped.flatMap((n) => n.tags), ...filters.tags])).sort()
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <MultiSelect
          label={t.form.workspace}
          icon={Layers}
          selected={filters.workspaces}
          onChange={(v) => setFilters({ ...filters, workspaces: v })}
          options={workspaces.map((w) => ({ value: w.id, label: w.name, icon: w.emoji ?? "📁", color: w.color }))}
        />
        <MultiSelect
          label={t.status}
          icon={CircleDot}
          selected={filters.statuses}
          onChange={(v) => setFilters({ ...filters, statuses: v as Status[] })}
          options={STATUSES.map((s) => ({ value: s, label: t.statuses[s], ...STATUS_VISUAL[s] }))}
        />
        <MultiSelect
          label={t.form.category}
          icon={Tag}
          selected={filters.categories}
          onChange={(v) => setFilters({ ...filters, categories: v })}
          options={categories.map((c) => ({ value: c, label: c, icon: "🏷️", color: colorForCategory(c) }))}
        />
        <MultiSelect
          label={t.priority}
          icon={Flame}
          selected={filters.priorities}
          onChange={(v) => setFilters({ ...filters, priorities: v as Priority[] })}
          options={PRIORITIES.map((p) => ({ value: p, label: t.priorities[p], ...PRIORITY_VISUAL[p] }))}
        />
        <MultiSelect
          label={t.form.tags}
          icon={Hash}
          selected={filters.tags}
          onChange={(v) => setFilters({ ...filters, tags: v })}
          options={allTags.map((tag) => ({ value: tag, label: `#${tag}` }))}
        />
        <Pick
          label={t.form.deadline}
          icon={CalendarClock}
          value={filters.deadline}
          onChange={(v) => setFilters({ ...filters, deadline: v as Filters["deadline"] })}
          options={Object.entries(t.deadlineFilter).map(([value, label]) => ({ value, label, ...DEADLINE_VISUAL[value] }))}
        />
        <Pick
          label={t.sortBy}
          icon={ArrowUpDown}
          value={sortBy}
          withAll={false}
          onChange={(v) => setSortBy((v ?? "priority") as SortBy)}
          options={Object.entries(t.sort).map(([value, label]) => ({ value, label, icon: SORT_ICON[value] }))}
          trailing={<SortDirButton dir={sortDir} onChange={setSortDir} disabled={sortBy === "manual"} />}
        />
      </div>
    </section>
  )
}
