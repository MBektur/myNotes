"use client"

import * as React from "react"
import {
  addDays, addMonths, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns"
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ListTodo, Plus, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { isOverdue, todayStr } from "@/lib/filters"
import { useNotes } from "@/lib/notes-store"
import { noteColor, type Note } from "@/lib/types"
import { useShell } from "./app-shell"
import { priorityStyle } from "./note-card"

type View = "month" | "week" | "day" | "agenda"

const key = (d: Date) => format(d, "yyyy-MM-dd")
const dayMonth = (d: Date) => `${d.getDate()}-${t.dashboard.months[d.getMonth()]}`
const fullDate = (d: Date) => `${d.getFullYear()}-يىلى ${dayMonth(d)}`
const wd = (d: Date) => t.calendar.weekdays[d.getDay()]
const title = (n: Note) => n.title || n.content?.slice(0, 40) || t.untitled
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6

/* ---------- kichik bölekler ---------- */

function Chip({ n, onEdit }: { n: Note; onEdit: (n: Note) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onEdit(n)
      }}
      className={cn(
        `note-${noteColor(n)} note-surface block w-full truncate rounded-lg px-2 py-1 text-start text-xs shadow-sm`,
        n.status === "done" && "line-through opacity-60"
      )}
    >
      {title(n)}
    </button>
  )
}

function NoteRow({ n, onEdit }: { n: Note; onEdit: (n: Note) => void }) {
  const { move } = useNotes()
  return (
    <div className={cn(`note-${noteColor(n)} note-surface flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-sm`)}>
      <Checkbox
        checked={n.status === "done"}
        onCheckedChange={(v) => move(n.id, v ? "done" : "todo")}
        className="size-5 border-foreground/30 bg-white/70 data-checked:border-emerald-500 data-checked:bg-emerald-500 data-checked:text-white dark:bg-white/10"
      />
      <button type="button" onClick={() => onEdit(n)} className="min-w-0 flex-1 text-start">
        <span className={cn("block truncate text-sm font-regular", n.status === "done" && "line-through opacity-60")}>
          {title(n)}
        </span>
        <span className="block truncate text-xs text-foreground/60">
          {[n.category, t.statuses[n.status]].filter(Boolean).join(" · ")}
        </span>
      </button>
      {n.priority && (
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", priorityStyle[n.priority])}>
          {t.priorities[n.priority]}
        </span>
      )}
    </div>
  )
}

/* ---------- körünüshler ---------- */

function MonthView({
  cursor, byDay, onDay, onEdit,
}: { cursor: Date; byDay: Map<string, Note[]>; onDay: (d: Date) => void; onEdit: (n: Note) => void }) {
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 })
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const today = todayStr()
  const head = days.slice(0, 7)
  return (
    <div className="clay p-3 sm:p-5">
      <div className="grid grid-cols-7 border-b border-foreground/10 pb-2 text-center text-xs sm:text-sm">
        {head.map((d) => (
          <span key={d.getDay()} className={cn("text-muted-foreground", isWeekend(d) && "text-rose-500")}>
            <span className="hidden sm:inline">{wd(d)}</span>
            <span className="sm:hidden">{t.dashboard.days[d.getDay()]}</span>
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {days.map((d) => {
          const list = byDay.get(key(d)) ?? []
          const inMonth = isSameMonth(d, cursor)
          const isToday = key(d) === today
          const hasOverdue = list.some(isOverdue)
          return (
            <div
              key={key(d)}
              role="button"
              tabIndex={0}
              onClick={() => onDay(d)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onDay(d)}
              className={cn(
                "flex min-h-16 cursor-pointer flex-col gap-1 rounded-xl border border-foreground/10 bg-background/50 p-1.5 transition-colors hover:bg-background sm:min-h-28 sm:rounded-2xl sm:p-2",
                !inMonth && "opacity-40",
                isToday && "border-violet-400 ring-2 ring-violet-300/60",
                hasOverdue && !isToday && "border-rose-300 bg-rose-50/60 dark:bg-rose-950/20"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center self-end rounded-full text-xs font-bold sm:size-7 sm:text-sm",
                  isToday && "bg-violet-500 text-white shadow",
                  !isToday && isWeekend(d) && "text-rose-500"
                )}
              >
                {d.getDate()}
              </span>
              <div className="hidden flex-col gap-1 sm:flex">
                {list.slice(0, 3).map((n) => <Chip key={n.id} n={n} onEdit={onEdit} />)}
                {list.length > 3 && <span className="text-[11px] text-muted-foreground">{t.calendar.more(list.length - 3)}</span>}
              </div>
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {list.slice(0, 3).map((n) => (
                  <span key={n.id} className={cn(`note-${noteColor(n)} note-surface size-2 rounded-full border border-foreground/20`)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  cursor, byDay, onDay, onEdit, onAdd,
}: { cursor: Date; byDay: Map<string, Note[]>; onDay: (d: Date) => void; onEdit: (n: Note) => void; onAdd: (d: Date) => void }) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const today = todayStr()
  const all = days.flatMap((d) => byDay.get(key(d)) ?? [])
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {days.map((d) => {
          const list = byDay.get(key(d)) ?? []
          const isToday = key(d) === today
          return (
            <section key={key(d)} className={cn("clay flex flex-col gap-2 p-4", isToday && "ring-2 ring-violet-400")}>
              <header className="flex items-baseline justify-between border-b border-foreground/10 pb-2">
                <div>
                  <p className={cn("text-xs text-muted-foreground", isWeekend(d) && "text-rose-500")}>{wd(d)}</p>
                  <h3 className="text-2xl font-regular">{dayMonth(d)}</h3>
                </div>
                <button type="button" onClick={() => onAdd(d)} aria-label={t.calendar.addOnDay} className="flex size-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-200">
                  <Plus className="size-4" />
                </button>
              </header>
              <div className="flex min-h-16 flex-1 flex-col gap-1.5">
                {list.length === 0 && <p className="py-2 text-xs text-muted-foreground">{t.calendar.noNotes}</p>}
                {list.map((n) => <Chip key={n.id} n={n} onEdit={onEdit} />)}
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onDay(d)}>
                {t.calendar.openDay}
              </Button>
            </section>
          )
        })}
      </div>
      <section className="clay clay-lilac flex flex-wrap items-center gap-x-8 gap-y-2 p-4">
        <h3 className="text-xl font-regular">{t.calendar.weekSummary}</h3>
        <span className="text-sm">{t.calendar.noteCount}: <b>{all.length}</b></span>
        <span className="text-sm">{t.calendar.doneCount}: <b>{all.filter((n) => n.status === "done").length}</b></span>
        <span className="text-sm">{t.calendar.overdueCount}: <b>{all.filter(isOverdue).length}</b></span>
      </section>
    </div>
  )
}

function DayView({
  cursor, byDay, onEdit, onAdd, onShift,
}: { cursor: Date; byDay: Map<string, Note[]>; onEdit: (n: Note) => void; onAdd: (d: Date) => void; onShift: (n: number) => void }) {
  const list = byDay.get(key(cursor)) ?? []
  const stats = [
    { label: t.calendar.noteCount, value: list.length, icon: ListTodo, tone: "clay-lilac" },
    { label: t.calendar.doneCount, value: list.filter((n) => n.status === "done").length, icon: CheckCircle2, tone: "clay-green" },
    { label: t.calendar.overdueCount, value: list.filter(isOverdue).length, icon: TriangleAlert, tone: "clay-pink" },
  ]
  return (
    <div className="space-y-4">
      <section className="clay flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{wd(cursor)} · {t.calendar.dayPlan}</p>
          <h2 className="text-4xl font-regular">{fullDate(cursor)}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => onShift(-1)}><ChevronRight /> {t.calendar.prevDay}</Button>
          <Button variant="outline" className="rounded-xl" onClick={() => onShift(1)}>{t.calendar.nextDay} <ChevronLeft /></Button>
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={cn("clay flex items-center gap-3 p-4", s.tone)}>
            <s.icon className="size-8 opacity-70" />
            <div>
              <p className="text-xs text-foreground/70">{s.label}</p>
              <p className="text-3xl font-extrabold leading-none">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="clay space-y-2 p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-2xl font-regular">{t.calendar.dayPlan}</h2>
          <Button size="sm" className="rounded-xl" onClick={() => onAdd(cursor)}><Plus /> {t.calendar.addOnDay}</Button>
        </div>
        {list.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t.calendar.noNotes}</p>}
        {list.map((n) => <NoteRow key={n.id} n={n} onEdit={onEdit} />)}
      </section>
    </div>
  )
}

function AgendaView({
  cursor, byDay, onDay, onEdit,
}: { cursor: Date; byDay: Map<string, Note[]>; onDay: (d: Date) => void; onEdit: (n: Note) => void }) {
  const first = startOfMonth(cursor)
  const last = endOfMonth(cursor)
  const days: Date[] = []
  for (let d = first; d <= last; d = addDays(d, 1)) if ((byDay.get(key(d)) ?? []).length) days.push(d)
  const today = todayStr()
  if (days.length === 0)
    return <div className="clay py-16 text-center text-sm text-muted-foreground">{t.calendar.monthEmpty}</div>
  return (
    <div className="clay overflow-hidden">
      {days.map((d) => {
        const list = byDay.get(key(d)) ?? []
        const isToday = key(d) === today
        return (
          <section key={key(d)} className="border-b border-foreground/10 last:border-b-0">
            <button
              type="button"
              onClick={() => onDay(d)}
              className={cn("flex w-full items-center justify-between gap-2 bg-foreground/[0.03] px-5 py-2.5 text-start", isToday && "bg-violet-100/70 dark:bg-violet-900/30")}
            >
              <span className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-regular", isToday ? "bg-violet-500 text-white" : "bg-foreground/10")}>{wd(d)}</span>
                <span className="font-bold">{dayMonth(d)}</span>
                {isToday && <span className="text-xs text-violet-600 dark:text-violet-300">{t.today}</span>}
              </span>
              <span className="text-xs text-muted-foreground">{t.calendar.notes(list.length)}</span>
            </button>
            <div className="my-3 me-4 ms-10 space-y-1.5 border-s-2 border-violet-200 ps-3 dark:border-violet-800">
              {list.map((n) => <NoteRow key={n.id} n={n} onEdit={onEdit} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/* ---------- bet ---------- */

export function CalendarPage() {
  const { notes, hydrated } = useNotes()
  const { edit, add } = useShell()
  const [view, setView] = React.useState<View>("month")
  const [cursor, setCursor] = React.useState(() => new Date())

  const byDay = React.useMemo(() => {
    const m = new Map<string, Note[]>()
    for (const n of notes) if (n.deadline) m.set(n.deadline, [...(m.get(n.deadline) ?? []), n])
    return m
  }, [notes])

  const shift = (dir: 1 | -1) =>
    setCursor((c) => (view === "week" ? addDays(c, 7 * dir) : view === "day" ? addDays(c, dir) : addMonths(c, dir)))
  const goDay = (d: Date) => {
    setCursor(d)
    setView("day")
  }
  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i)

  if (!hydrated) return null

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 })
  const label =
    view === "week"
      ? `${dayMonth(weekStart)} – ${dayMonth(addDays(weekStart, 6))} ${addDays(weekStart, 6).getFullYear()}`
      : view === "day"
        ? fullDate(cursor)
        : `${t.dashboard.months[cursor.getMonth()]} ${cursor.getFullYear()}`

  return (
    <>
      <div className="clay flex flex-wrap items-center gap-2 p-3">
        <ToggleGroup
          variant="outline"
          value={[view]}
          onValueChange={(v) => v[0] && setView(v[0] as View)}
          aria-label={t.switchView}
        >
          {(["month", "week", "day", "agenda"] as View[]).map((v) => (
            <ToggleGroupItem key={v} value={v}>{t.calendar.views[v]}</ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => shift(-1)} aria-label={t.calendar.prev}><ChevronRight /></Button>
          <Select value={String(cursor.getMonth())} onValueChange={(v) => setCursor(new Date(cursor.getFullYear(), Number(v), 1))}>
            <SelectTrigger size="sm" className="w-32 rounded-xl"><SelectValue>{(v: string) => t.dashboard.months[Number(v)]}</SelectValue></SelectTrigger>
            <SelectContent>
              {t.dashboard.months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(cursor.getFullYear())} onValueChange={(v) => setCursor(new Date(Number(v), cursor.getMonth(), 1))}>
            <SelectTrigger size="sm" className="w-24 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => shift(1)} aria-label={t.calendar.next}><ChevronLeft /></Button>
        </div>

        <Button variant="outline" className="rounded-xl" onClick={() => setCursor(new Date())}>{t.today}</Button>
        <span className="ms-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <CalendarDays className="size-4" /> {label}
        </span>
      </div>

      {view === "month" && <MonthView cursor={cursor} byDay={byDay} onDay={goDay} onEdit={edit} />}
      {view === "week" && <WeekView cursor={cursor} byDay={byDay} onDay={goDay} onEdit={edit} onAdd={(d) => add(undefined, key(d))} />}
      {view === "day" && (
        <DayView cursor={cursor} byDay={byDay} onEdit={edit} onAdd={(d) => add(undefined, key(d))} onShift={(n) => setCursor((c) => addDays(c, n))} />
      )}
      {view === "agenda" && <AgendaView cursor={cursor} byDay={byDay} onDay={goDay} onEdit={edit} />}
    </>
  )
}
