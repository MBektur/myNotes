"use client"

import * as React from "react"
import { Car, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import { DEFAULT_TRAVEL_MIN, type Lesson, type Person } from "@/lib/schedule-data"
import { fromMin, layoutLanes, toMin } from "@/lib/schedule"
import { SubjectBadge } from "./subject-badge"

const HOUR_PX = 64
const DEFAULT_RANGE: [number, number] = [8 * 60, 21 * 60]

type Item = { lesson: Lesson; person: Person; start: string; end: string; before: number; after: number }
export type TimetableDay = { wd: number; date: Date; k: string; shown: Lesson[] }

/** Bir derske qoshulidighan yol waqti (minut): kün ichidiki birinchi dersning aldigha, axirqi dersning kéyinige */
export function commuteFor(lesson: Lesson, mine: Lesson[], person: Person) {
  const travel = person.travelMin ?? DEFAULT_TRAVEL_MIN
  const first = mine.reduce((a, b) => (toMin(b.start) < toMin(a.start) ? b : a))
  const last = mine.reduce((a, b) => (toMin(b.end) > toMin(a.end) ? b : a))
  return {
    before: lesson.id === first.id ? Math.min(travel, toMin(lesson.start)) : 0,
    after: lesson.id === last.id ? Math.min(travel, 24 * 60 - toMin(lesson.end)) : 0,
  }
}

/** Her kishining her künki birinchi/axirqi dersige yol waqtini qoshidu */
function buildItems(shown: Lesson[], byId: Record<string, Person>): Item[] {
  const items: Item[] = []
  const groups = new Map<string, Lesson[]>()
  for (const l of shown) groups.set(l.personId, [...(groups.get(l.personId) ?? []), l])
  for (const [pid, ls] of groups) {
    const person = byId[pid]
    if (!person) continue
    for (const l of ls) {
      const { before, after } = commuteFor(l, ls, person)
      items.push({
        lesson: l, person, before, after,
        start: fromMin(toMin(l.start) - before),
        end: fromMin(toMin(l.end) + after),
      })
    }
  }
  return items
}

export function ScheduleTimetable({
  days, byId, hues, todayKey, activeMobile, selectedKey, onSelect,
}: {
  days: TimetableDay[]
  byId: Record<string, Person>
  hues: Map<string, number>
  todayKey: string
  activeMobile: number
  selectedKey: string | null
  onSelect: (lessonId: string, date: string) => void
}) {
  const perDay = days.map((d) => ({ ...d, items: buildItems(d.shown, byId) }))
  const all = perDay.flatMap((d) => d.items)
  const lo = all.length ? Math.min(...all.map((i) => toMin(i.start))) : DEFAULT_RANGE[0]
  const hi = all.length ? Math.max(...all.map((i) => toMin(i.end))) : DEFAULT_RANGE[1]
  const startH = Math.floor(lo / 60)
  const endH = Math.ceil(hi / 60)
  const bodyPx = (endH - startH) * HOUR_PX
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i)
  const px = (min: number) => ((min - startH * 60) / 60) * HOUR_PX

  return (
    <div className="clay flex overflow-hidden p-2 sm:p-3">
      <div className="w-11 shrink-0 sm:w-12">
        <div className="h-14" />
        <div className="relative" style={{ height: bodyPx }}>
          {hours.map((h) => (
            <span
              key={h}
              className="absolute end-1 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
              style={{ top: (h - startH) * HOUR_PX }}
            >
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-1 md:grid-cols-7">
        {perDay.map((d, i) => {
          const isToday = d.k === todayKey
          return (
            <div key={d.wd} className={cn("min-w-0 border-s border-border/60", i % 2 === 1 && "bg-muted/50", activeMobile !== d.wd && "hidden md:block")}>
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
              <div className={cn("relative", isToday && "bg-primary/5")} style={{ height: bodyPx }}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-border/50" style={{ top: (h - startH) * HOUR_PX }} />
                ))}
                {layoutLanes(d.items).map(({ item: it, lane, lanes }) => {
                  const l = it.lesson
                  const a = toMin(it.start)
                  const b = toMin(it.end)
                  const h = px(b) - px(a)
                  const beforePx = (it.before / 60) * HOUR_PX
                  const afterPx = (it.after / 60) * HOUR_PX
                  const bodyH = h - beforePx - afterPx
                  const sel = selectedKey === `${l.id}|${d.k}`
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onSelect(l.id, d.k)}
                      title={`${it.person.name} · ${l.subject} · ${l.start}–${l.end}${l.note ? ` · ${l.note}` : ""}`}
                      className={cn(
                        `note-${it.person.color} note-surface absolute flex flex-col overflow-hidden rounded-2xl text-start shadow-sm transition hover:z-10 hover:shadow-md`,
                        l.flexible && "border-2 border-dashed",
                        sel && "ring-2 ring-primary"
                      )}
                      style={{
                        top: px(a),
                        height: h - 3,
                        width: `calc(${100 / lanes}% - 4px)`,
                        insetInlineStart: `calc(${(lane * 100) / lanes}% + 2px)`,
                        borderColor: l.flexible ? "var(--note-chip)" : undefined,
                      }}
                    >
                      {it.before > 0 && <TravelStrip px={beforePx} min={it.before} edge="before" />}
                      <div className="relative flex min-h-0 flex-1 flex-col gap-1 px-2 py-1.5 text-[11px] leading-tight">
                        {l.flexible && <span aria-hidden className="hatch pointer-events-none absolute inset-0" />}
                        <span className="relative flex items-center gap-1 tabular-nums opacity-75">
                          <Clock className="size-3 shrink-0" />
                          <span className="truncate">{l.flexible && "~ "}{l.start}–{l.end}</span>
                        </span>
                        {bodyH >= 44 && <span className="relative"><SubjectBadge subject={l.subject} hue={hues.get(l.subject)} /></span>}
                        {l.flexible && bodyH >= 66 && (
                          <span className="relative w-fit max-w-full truncate rounded-md bg-foreground/80 px-1.5 py-px text-[10px] font-medium text-background">
                            ~ {t.schedule.flexibleTag}
                          </span>
                        )}
                        {bodyH >= 62 && (
                          <span className="relative mt-auto flex items-center gap-1.5 border-t border-foreground/10 pt-1">
                            <span
                              className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
                              style={{ background: "var(--note-chip)" }}
                            >
                              {it.person.name[0]}
                            </span>
                            <span className="truncate font-medium">{it.person.name}</span>
                          </span>
                        )}
                      </div>
                      {it.after > 0 && <TravelStrip px={afterPx} min={it.after} edge="after" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TravelStrip({ px, min, edge }: { px: number; min: number; edge: "before" | "after" }) {
  return (
    <div
      className={cn(
        "hatch flex shrink-0 items-center gap-1 overflow-hidden bg-foreground/5 px-2 text-[10px] text-foreground/70",
        edge === "before" ? "border-b border-dashed border-foreground/30" : "border-t border-dashed border-foreground/30"
      )}
      style={{ height: px }}
    >
      <Car className="size-3 shrink-0" />
      <span className="truncate">{t.schedule.travel(min)}</span>
    </div>
  )
}
