"use client"

import * as React from "react"
import { addDays, addWeeks, format, startOfWeek } from "date-fns"
import { CalendarDays, Car, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/ui/hint"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { SCHEDULE_END_HOUR, SCHEDULE_START_HOUR } from "@/lib/schedule-data"
import { SchedulePanel } from "./schedule-panel"
import { ScheduleTimetable } from "./schedule-timetable"
import { SubjectBadge } from "./subject-badge"
import { loadScheduleUi, saveScheduleUi, useSchedule, type ScheduleView } from "@/lib/schedule-store"
import { intersect, layoutLanes, lessonsOn, slotsToRanges, subjectHues, subtract, toMin, type Range } from "@/lib/schedule"

const HOUR_PX = 56
const START_MIN = SCHEDULE_START_HOUR * 60
const END_MIN = SCHEDULE_END_HOUR * 60
const BODY_PX = ((END_MIN - START_MIN) / 60) * HOUR_PX
const hours = Array.from({ length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 }, (_, i) => SCHEDULE_START_HOUR + i)
/** Hepte düshenbidin bashlinidu */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const key = (d: Date) => format(d, "yyyy-MM-dd")
const dayMonth = (d: Date) => `${d.getDate()}-${t.dashboard.months[d.getMonth()]}`
const top = (min: number) => ((Math.max(min, START_MIN) - START_MIN) / 60) * HOUR_PX
const height = (a: number, b: number) => ((Math.min(b, END_MIN) - Math.max(a, START_MIN)) / 60) * HOUR_PX

/** Ikon tugmisi + tooltip */
function IconTip({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Hint label={label}>
      <Button variant="outline" size="icon" aria-label={label} onClick={onClick}>
        {children}
      </Button>
    </Hint>
  )
}

export function SchedulePage() {
  const { people, lessons } = useSchedule()
  const hues = React.useMemo(() => subjectHues(lessons), [lessons])
  const hasAvail = people.some((p) => Object.values(p.avail).some((v) => v?.length))
  const byId = React.useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  // selected: "yoshurulghan" kishiler; shuning bilen yéngi kirgüzülgen kishiler aptomatik körünidu
  // Süzgüch (yoshurulghan kishiler) we körünüsh brauzérda saqlinidu; sehipe AuthGate arqisida, peqet istemci tarapta ishleydu
  const [saved] = React.useState(loadScheduleUi)
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set(saved.hidden))
  const selected = React.useMemo(() => new Set(people.filter((p) => !hidden.has(p.id)).map((p) => p.id)), [people, hidden])
  const [view, setView] = React.useState<ScheduleView>(saved.view)
  React.useEffect(() => {
    saveScheduleUi({ hidden: [...hidden], view })
  }, [hidden, view])
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [mobileDay, setMobileDay] = React.useState<number | null>(null)
  const [detailRef, setDetail] = React.useState<{ id: string; date: string } | null>(null)

  // Sehipe AuthGate arqisida, peqet istemci tarapta ishleydu
  const [now] = React.useState(() => new Date())

  const weekStart = React.useMemo(
    () => addWeeks(startOfWeek(now, { weekStartsOn: 1 }), weekOffset),
    [now, weekOffset]
  )
  const days = WEEK_ORDER.map((wd, i) => ({ wd, date: addDays(weekStart, i) }))
  const todayKey = key(now)
  const activeMobile = mobileDay ?? (weekOffset === 0 ? now.getDay() : 1)

  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const detailLesson = detailRef ? lessons.find((l) => l.id === detailRef.id) : undefined
  const detail = detailRef && detailLesson && byId[detailLesson.personId] ? { lesson: detailLesson, date: detailRef.date } : null

  const chosen = people.filter((p) => selected.has(p.id))

  const dayData = days.map(({ wd, date }) => {
    const k = key(date)
    const all = lessonsOn(lessons, k, wd)
    const shown = all.filter((l) => selected.has(l.personId))
    // Her kishining shu künki boshluq waqti = musaitlik − ders; ortaq boshluq = kesishme
    let free: Range[] = []
    if (chosen.length > 0) {
      free = chosen
        .map((p) =>
          subtract(
            slotsToRanges(p.avail[wd]),
            all.filter((l) => l.personId === p.id).map((l) => [toMin(l.start), toMin(l.end)] as Range)
          )
        )
        .reduce((a, b) => intersect(a, b))
    }
    return { wd, date, k, shown, free }
  })

  const weekLabel = `${dayMonth(days[0].date)} – ${dayMonth(days[6].date)}`

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- Süzgüch ---------- */}
      <section className="clay flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t.schedule.people} · {t.schedule.selected(chosen.length, people.length)}
          </span>
          <div className="ms-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setHidden(new Set())}>
              {t.schedule.all}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setHidden(new Set(people.map((p) => p.id)))}>
              {t.schedule.clear}
            </Button>
          </div>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {people.map((p) => {
            const on = selected.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.id)}
                className={cn(
                  `note-${p.color} flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm whitespace-nowrap transition`,
                  on ? "note-surface border-[var(--note-chip)] shadow-sm" : "border-transparent bg-muted/60 opacity-60"
                )}
              >
                <span className="size-3 rounded-full" style={{ background: "var(--note-chip)" }} />
                {p.name}
              </button>
            )
          })}
        </div>
        <div className="no-scrollbar -mx-4 flex items-center gap-x-4 gap-y-1.5 overflow-x-auto px-4 pb-1 text-xs whitespace-nowrap text-muted-foreground md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&>*]:shrink-0">
          {[...hues].map(([name, hue]) => (
            <SubjectBadge key={name} subject={name} hue={hue} className="text-xs" />
          ))}
          {lessons.some((l) => l.flexible) && (
            <span className="flex items-center gap-1.5">
              <span className="hatch size-3 rounded-sm border-2 border-dashed border-foreground/50" />
              {t.schedule.flexible}
            </span>
          )}
          {hasAvail && (
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-emerald-400/40 ring-1 ring-emerald-500/50" />
              {t.schedule.free}
              {chosen.length > 1 && <span>({t.schedule.freeHint})</span>}
            </span>
          )}
        </div>
      </section>

      {/* ---------- Hepte gézishi ---------- */}
      <div className="flex items-center gap-2">
        <IconTip label={t.schedule.prevWeek} onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronRight className="rtl:block ltr:hidden" />
          <ChevronLeft className="ltr:block rtl:hidden" />
        </IconTip>
        <IconTip label={t.schedule.nextWeek} onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronLeft className="rtl:block ltr:hidden" />
          <ChevronRight className="ltr:block rtl:hidden" />
        </IconTip>
        <h2 className="min-w-0 flex-1 truncate text-lg sm:text-xl">{weekLabel}</h2>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setWeekOffset(0); setMobileDay(null) }}>
            {t.schedule.thisWeek}
          </Button>
        )}
        <div className="clay flex shrink-0 gap-1 rounded-2xl p-1">
          {([
            ["week", t.schedule.viewWeek, <CalendarDays key="w" />],
            ["timetable", t.schedule.viewTimetable, <GraduationCap key="t" />],
          ] as const).map(([v, label, icon]) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 rounded-xl px-2.5"
              aria-label={label}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>
      {view === "timetable" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Car className="size-3.5 shrink-0" /> {t.schedule.travelNote}
        </p>
      )}

      {/* ---------- Mobil: kün tallash ---------- */}
      <div className="flex gap-1.5 md:hidden" role="tablist">
        {dayData.map((d) => (
          <button
            key={d.wd}
            type="button"
            role="tab"
            aria-selected={activeMobile === d.wd}
            onClick={() => setMobileDay(d.wd)}
            className={cn(
              "flex flex-1 flex-col items-center rounded-2xl py-1.5 text-[11px]",
              activeMobile === d.wd ? "bg-primary text-primary-foreground" : "clay text-foreground/70"
            )}
          >
            <span>{t.dashboard.days[d.wd]}</span>
            <span className="text-sm font-medium">{d.date.getDate()}</span>
          </button>
        ))}
      </div>

      {/* ---------- schedule ---------- */}
      {chosen.length === 0 ? (
        <div className="clay p-8 text-center text-muted-foreground">{t.schedule.noPeople}</div>
      ) : view === "timetable" ? (
        <ScheduleTimetable
          days={dayData}
          byId={byId}
          hues={hues}
          todayKey={todayKey}
          activeMobile={activeMobile}
          selectedKey={detailRef ? `${detailRef.id}|${detailRef.date}` : null}
          onSelect={(id, date) => setDetail({ id, date })}
        />
      ) : (
        <div className="clay flex overflow-hidden p-2 sm:p-3">
          {/* Waqit ustuni */}
          <div className="w-11 shrink-0 sm:w-12">
            <div className="h-14" />
            <div className="relative" style={{ height: BODY_PX }}>
              {hours.slice(0, -1).map((h) => (
                <span
                  key={h}
                  className="absolute end-1 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
                  style={{ top: (h - SCHEDULE_START_HOUR) * HOUR_PX }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 md:grid-cols-7">
            {dayData.map((d, i) => {
              const isToday = d.k === todayKey
              return (
                <div
                  key={d.wd}
                  className={cn("min-w-0 border-s border-border/60", i % 2 === 1 && "bg-muted/50", activeMobile !== d.wd && "hidden md:block")}
                >
                  <div className={cn("flex h-14 flex-col items-center justify-center", isToday && "text-primary")}>
                    <span className="text-xs">{t.calendar.weekdays[d.wd]}</span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium",
                        isToday && "bg-primary text-primary-foreground"
                      )}
                    >
                      {d.date.getDate()}
                    </span>
                  </div>
                  <div className="relative" style={{ height: BODY_PX }}>
                    {hours.slice(0, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-border/50"
                        style={{ top: (h - SCHEDULE_START_HOUR) * HOUR_PX }}
                      />
                    ))}
                    {d.free.map(([a, b]) => (
                      <div
                        key={`${a}-${b}`}
                        aria-hidden
                        className="absolute inset-x-0.5 rounded-md bg-emerald-400/25 ring-1 ring-emerald-500/30"
                        style={{ top: top(a), height: height(a, b) }}
                      />
                    ))}
                    {layoutLanes(d.shown).map(({ item: l, lane, lanes }) => {
                      const p = byId[l.personId]
                      const a = toMin(l.start)
                      const b = toMin(l.end)
                      const h = height(a, b)
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setDetail({ id: l.id, date: d.k })}
                          title={`${p.name} · ${l.subject} · ${l.start}–${l.end}${l.flexible ? ` · ${t.schedule.flexible}` : ""}${l.note ? ` · ${l.note}` : ""}`}
                          className={cn(
                            `note-${p.color} note-surface absolute overflow-hidden rounded-lg px-1.5 py-1 text-start text-[11px] leading-tight shadow-sm transition hover:z-10 hover:shadow-md`,
                            l.flexible ? "border-2 border-dashed opacity-90" : "border-s-4",
                            detail?.lesson.id === l.id && detail.date === d.k && "ring-2 ring-primary"
                          )}
                          style={{
                            top: top(a),
                            height: h - 2,
                            width: `calc(${100 / lanes}% - 4px)`,
                            insetInlineStart: `calc(${(lane * 100) / lanes}% + 2px)`,
                            borderColor: "var(--note-chip)",
                          }}
                        >
                          {l.flexible && <span aria-hidden className="hatch pointer-events-none absolute inset-0" />}
                          <span className="relative block truncate font-medium">{p.name}</span>
                          {h >= 38 && <SubjectBadge subject={l.subject} hue={hues.get(l.subject)} className="relative mt-0.5" />}
                          {l.flexible && h >= 52 && (
                            <span className="relative mt-0.5 block w-fit max-w-full truncate rounded-md bg-foreground/80 px-1.5 py-px text-[10px] font-medium text-background">
                              ~ {t.schedule.flexibleTag}
                            </span>
                          )}
                          {h >= (l.flexible ? 70 : 52) && (
                            <span className="relative block truncate opacity-60 tabular-nums">
                              {l.flexible && "~ "}{l.start}–{l.end}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <SchedulePanel
        selection={detailRef}
        lessons={lessons}
        byId={byId}
        hues={hues}
        onSelect={(id, date) => setDetail({ id, date })}
        onClose={() => setDetail(null)}
      />
    </div>
  )
}
