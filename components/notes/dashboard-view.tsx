"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Plus } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { isOverdue, todayStr } from "@/lib/filters"
import { useNotes } from "@/lib/notes-store"
import { categoryProgress, computeStats, topTasks, upcoming, weeklyActivity } from "@/lib/stats"
import type { Note } from "@/lib/types"
import { ActivityChart } from "./activity-chart"

/* ---------- 3D-ish ikonlar (inline SVG) ---------- */
function Clipboard() {
  return (
    <svg viewBox="0 0 64 64" className="size-11 sm:size-16 drop-shadow-[0_6px_6px_rgba(120,80,200,.35)]">
      <rect x="10" y="10" width="44" height="50" rx="10" fill="#8b6fe0" />
      <rect x="10" y="10" width="44" height="50" rx="10" fill="url(#cg1)" />
      <rect x="16" y="18" width="32" height="38" rx="6" fill="#fff" />
      <rect x="22" y="4" width="20" height="12" rx="5" fill="#6d4fd0" />
      <path d="M21 30l3 3 6-6M21 44l3 3 6-6" stroke="#8b6fe0" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M35 30h9M35 44h9" stroke="#c9bdf3" strokeWidth="3.5" strokeLinecap="round" />
      <defs><linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 64 64" className="size-11 sm:size-16 drop-shadow-[0_6px_6px_rgba(230,90,120,.3)]">
      <rect x="8" y="12" width="48" height="46" rx="11" fill="#fff" stroke="#fbd0d6" strokeWidth="2" />
      <path d="M8 24a11 11 0 0 1 11-12h26a11 11 0 0 1 11 12z" fill="#f4727f" />
      <rect x="18" y="5" width="6" height="14" rx="3" fill="#e0525f" />
      <rect x="40" y="5" width="6" height="14" rx="3" fill="#e0525f" />
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={16 + c * 13} y={32 + r * 9} width="9" height="6" rx="2" fill="#f9a6b0" />
      )))}
    </svg>
  )
}
function FlagIcon() {
  return (
    <svg viewBox="0 0 64 64" className="size-11 sm:size-16 drop-shadow-[0_6px_6px_rgba(40,150,90,.3)]">
      <ellipse cx="20" cy="58" rx="14" ry="4" fill="#cfd8cf" />
      <rect x="17" y="8" width="5" height="50" rx="2.5" fill="#e8eee8" stroke="#c8d2c8" />
      <path d="M22 10c10-4 14 6 24 2 4-1 6-1 8 0v22c-2-1-4-1-8 0-10 4-14-6-24-2z" fill="#4cc27a" />
      <path d="M22 10c10-4 14 6 24 2 4-1 6-1 8 0v8c-4-2-8 0-12 2-8 3-12-4-20-2z" fill="#fff" opacity=".28" />
    </svg>
  )
}
function StarIcon() {
  return (
    <svg viewBox="0 0 64 64" className="size-11 sm:size-16 drop-shadow-[0_6px_6px_rgba(230,160,30,.35)]">
      <path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8 16.8 52.8l2.9-16.9-12.3-12 17-2.5z" fill="#fbc531" stroke="#f0a91d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 11l5.5 11.2 12.4 1.8-9 8.7 2.1 12.3L32 39z" fill="#fff" opacity=".35" />
      <circle cx="25" cy="30" r="1.8" fill="#8a5a10" /><circle cx="39" cy="30" r="1.8" fill="#8a5a10" />
      <path d="M28 35q4 3 8 0" stroke="#8a5a10" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function StatCard({
  tone,
  icon,
  label,
  value,
  hint,
  hintClass,
}: {
  tone: string
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint: string
  hintClass: string
}) {
  return (
    <div className={cn("clay flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4", tone)}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-foreground/75">{label}</p>
        <p className="text-2xl leading-none font-extrabold sm:text-4xl tracking-tight">{value}</p>
        <p className={cn("mt-1.5 truncate text-xs font-medium", hintClass)}>{hint}</p>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
  className,
  id,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn("clay p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const pill = "rounded-full px-3 py-1 text-xs font-semibold"

const folderTones = [
  { icon: "text-violet-500", bar: "bg-violet-400", bg: "bg-violet-100 dark:bg-violet-900/40" },
  { icon: "text-pink-500", bar: "bg-pink-400", bg: "bg-pink-100 dark:bg-pink-900/40" },
  { icon: "text-emerald-500", bar: "bg-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40" },
  { icon: "text-amber-500", bar: "bg-amber-400", bg: "bg-amber-100 dark:bg-amber-900/40" },
]

const reminderTones = [
  { emoji: "⏰", bg: "bg-rose-400" },
  { emoji: "🎥", bg: "bg-sky-400" },
  { emoji: "🔔", bg: "bg-amber-300" },
  { emoji: "📌", bg: "bg-violet-400" },
]

const prioPill: Record<string, string> = {
  low: "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-200",
  medium: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-200",
  high: "bg-rose-100 text-rose-500 dark:bg-rose-900/50 dark:text-rose-200",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-200",
}

function relDate(deadline: string) {
  const today = todayStr()
  if (deadline === today) return t.today
  const tm = new Date()
  tm.setDate(tm.getDate() + 1)
  if (deadline === todayStr(tm)) return t.dashboard.tomorrow
  return deadline
}

export function DashboardView({
  onEdit,
  onAdd,
  onShowNotes,
}: {
  onEdit: (n: Note) => void
  onAdd: () => void
  onShowNotes: () => void
}) {
  const { notes, move } = useNotes()
  const [day, setDay] = React.useState<Date | undefined>()

  const stats = computeStats(notes)
  const activity = weeklyActivity(notes)
  const cats = categoryProgress(notes)
  const soon = upcoming(notes, 3)
  const top = topTasks(notes, 5)
  const deadlineDays = notes.filter((n) => n.deadline).map((n) => parseISO(n.deadline!))
  const dayNotes = day ? notes.filter((n) => n.deadline === format(day, "yyyy-MM-dd")) : []

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:col-span-12 lg:grid-cols-4">
        <StatCard tone="clay-lilac" icon={<Clipboard />} label={t.dashboard.stats.todo} value={stats.todo}
          hint={`${notes.length} ${t.notes}`} hintClass="text-violet-600 dark:text-violet-300" />
        <StatCard tone="clay-pink" icon={<CalendarIcon />} label={t.dashboard.stats.inProgress} value={stats.inProgress}
          hint={`${notes.filter((n) => n.status === "review").length} ${t.statuses.review}`} hintClass="text-pink-500 dark:text-pink-300" />
        <StatCard tone="clay-green" icon={<FlagIcon />} label={t.dashboard.stats.completed} value={stats.completedTotal}
          hint={t.dashboard.stats.completedHint} hintClass="text-emerald-600 dark:text-emerald-300" />
        <StatCard tone="clay-yellow" icon={<StarIcon />} label={t.dashboard.stats.checklist} value={`${stats.checklistDone}/${stats.checklistTotal}`}
          hint={t.dashboard.stats.checklistHint} hintClass="text-amber-600 dark:text-amber-300" />
      </div>

      <div className="grid gap-5 lg:col-span-8 lg:grid-rows-[auto_1fr]">
        <Panel
          title={t.dashboard.activity}
          action={<span className="clay rounded-xl px-3 py-1.5 text-xs shadow-none">{t.dashboard.thisWeek} ⌄</span>}
        >
          <ActivityChart data={activity} peakLabel />
        </Panel>

        <div className="grid gap-5 md:grid-cols-2">
          <Panel
            title={t.dashboard.categoryProgress}
            action={<button type="button" onClick={onShowNotes} className={cn(pill, "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-200")}>{t.dashboard.viewAll}</button>}
          >
            {cats.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noCategories}</p>
            ) : (
              <ul className="space-y-4">
                {cats.slice(0, 4).map((c, i) => {
                  const tone = folderTones[i % folderTones.length]
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone.bg)} aria-hidden>
                        <svg viewBox="0 0 24 24" className={cn("size-6 drop-shadow-sm", tone.icon)}>
                          <path d="M2 7a3 3 0 0 1 3-3h4.2c.8 0 1.5.4 2 1l1 1.4H19a3 3 0 0 1 3 3V17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="currentColor" />
                          <path d="M2 10.5h20V17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#fff" opacity=".28" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.category}</p>
                        <div className="mt-1.5 h-2 rounded-full bg-foreground/10">
                          <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${Math.max(c.pct, 4)}%` }} />
                        </div>
                      </div>
                      <span className="w-10 text-end text-xs text-muted-foreground">{c.pct}%</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title={t.dashboard.topTasks}
            action={<button type="button" onClick={onShowNotes} className={cn(pill, "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200")}>{t.dashboard.viewAll}</button>}
          >
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.empty}</p>
            ) : (
              <ul className="divide-y divide-foreground/10">
                {top.map((n) => (
                  <li key={n.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Checkbox
                      checked={n.status === "done"}
                      onCheckedChange={(v) => move(n.id, v ? "done" : "todo")}
                      className="size-5 rounded-md data-checked:border-emerald-500 data-checked:bg-emerald-500"
                    />
                    <button type="button" className="min-w-0 flex-1 truncate text-start" onClick={() => onEdit(n)}>
                      {n.title || n.content?.slice(0, 40) || t.untitled}
                    </button>
                    {n.priority && (
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", prioPill[n.priority])}>
                        {t.priorities[n.priority]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="grid content-start gap-5 lg:col-span-4">
        <Panel title={t.dashboard.calendar} id="dash-calendar">
          <Calendar
            dir="rtl"
            weekStartsOn={1}
            mode="single"
            selected={day}
            onSelect={setDay}
            formatters={{
              formatCaption: (d: Date) => `${t.dashboard.months[d.getMonth()]} ${d.getFullYear()}`,
              formatWeekdayName: (d: Date) => t.dashboard.days[d.getDay()],
            }}
            modifiers={{ deadline: deadlineDays, weekend: (d: Date) => d.getDay() === 0 || d.getDay() === 6 }}
            modifiersClassNames={{
              deadline: "after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-pink-400",
              weekend: "text-rose-500",
            }}
            classNames={{
              today: "[&>button]:bg-violet-400 [&>button]:text-white [&>button]:rounded-full [&>button]:shadow-[0_4px_10px_-3px_oklch(0.5_0.15_295/0.6)]",
            }}
            className="w-full bg-transparent p-0 [--cell-size:--spacing(7)] [&_.rdp-week]:mt-1 [&_.rdp-week]:mt-1"
          />
          {day && (
            <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              {dayNotes.length === 0 && <li className="text-muted-foreground">{t.dashboard.noneOnDay}</li>}
              {dayNotes.map((n) => (
                <li key={n.id}>
                  <button type="button" className="w-full truncate text-start hover:underline" onClick={() => onEdit(n)}>
                    {n.title || n.content?.slice(0, 40) || t.untitled}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t.dashboard.upcoming}
          className="clay-pink"
          action={
            <button
              type="button"
              onClick={onAdd}
              aria-label={t.newNote}
              className="flex size-8 items-center justify-center rounded-xl bg-pink-400 text-white shadow-[0_6px_12px_-4px_oklch(0.6_0.2_5/0.6),inset_0_2px_2px_oklch(1_0_0/0.4)]"
            >
              <Plus className="size-5" />
            </button>
          }
        >
          {soon.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.dashboard.noUpcoming}</p>
          ) : (
            <ul className="space-y-3.5">
              {soon.map((n, i) => (
                <li key={n.id}>
                  <button type="button" onClick={() => onEdit(n)} className="flex w-full items-center gap-3 text-start">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-base shadow-sm", reminderTones[i % reminderTones.length].bg)} aria-hidden>
                      {reminderTones[i % reminderTones.length].emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{n.title || n.content?.slice(0, 40) || t.untitled}</span>
                      <span className={cn("block text-xs", isOverdue(n) ? "font-medium text-red-600 dark:text-red-400" : "text-foreground/60")}>
                        {relDate(n.deadline!)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <section className="clay clay-lilac relative flex items-center gap-2 overflow-hidden p-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-extrabold text-violet-600 dark:text-violet-300">{t.dashboard.motivationTitle}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/70">{t.dashboard.motivationBody}</p>
          </div>
          <span className="relative shrink-0 text-7xl drop-shadow-lg" aria-hidden>
            🐰
            <span className="absolute -top-1 -end-2 text-2xl">⭐</span>
            <span className="absolute bottom-1 -start-3 text-lg">✨</span>
          </span>
        </section>
      </div>
    </div>
  )
}
