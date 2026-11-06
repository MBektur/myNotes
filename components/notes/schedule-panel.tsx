"use client"

import * as React from "react"
import { Car, Clock, MapPin, CalendarRange, CalendarX2, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidePanel, panelBtn } from "@/components/ui/side-panel"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { Lesson, Person } from "@/lib/schedule-data"
import { lessonsOn, toMin } from "@/lib/schedule"
import { commuteFor } from "./schedule-timetable"
import { SubjectBadge } from "./subject-badge"

const fmtKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number)
  return t.dateFmt.dayMonthYear(d, t.dashboard.months[m - 1], y)
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-2xl border bg-background p-3.5 text-[15px]">
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground [&>svg]:size-4">{icon} {label}</div>
      <div className="leading-snug break-words">{children}</div>
    </div>
  )
}

/** Dersni bosqanda ochulidighan yan panel: dérs tepsilati, kishi, yol waqti we shu kündiki bashqa dersler */
export function SchedulePanel({
  selection, lessons, byId, hues, onSelect, onClose,
}: {
  selection: { id: string; date: string } | null
  lessons: Lesson[]
  byId: Record<string, Person>
  hues: Map<string, number>
  onSelect: (id: string, date: string) => void
  onClose: () => void
}) {
  const live = selection ? lessons.find((l) => l.id === selection.id) : undefined
  const valid = selection && live && byId[live.personId] ? { lesson: live, date: selection.date } : null
  // Panel yépilish animatsiyesi waqtida mezmun birdinla yoqap ketmisun
  const [kept, setKept] = React.useState(valid)
  if (valid && (kept?.lesson !== valid.lesson || kept?.date !== valid.date)) setKept(valid)
  const shown = valid ?? kept

  const body = shown && (() => {
    const { lesson: l, date } = shown
    const person = byId[l.personId]
    const mine = lessonsOn(lessons, date, l.day)
      .filter((x) => x.personId === l.personId)
      .sort((a, b) => toMin(a.start) - toMin(b.start))
    const { before, after } = commuteFor(l, mine.length ? mine : [l], person)
    const dur = toMin(l.end) - toMin(l.start)
    return (
      <div className="space-y-4 px-5 py-4">
        {l.note && (
          <p className="flex items-start gap-1.5 text-base font-medium" dir="auto">
            <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" /> {l.note}
          </p>
        )}

        <section className={cn(`note-${person.color} note-surface space-y-2 rounded-2xl p-4 shadow-sm`, l.flexible && "border-2 border-dashed")} style={l.flexible ? { borderColor: "var(--note-chip)" } : undefined}>
          <div className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground/75">
            <span>{t.schedule.panel.dateTime}</span>
            <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs">{t.schedule.panel.duration(dur)}</span>
          </div>
          <div className="flex items-center gap-2 text-lg font-medium">
            <CalendarDays className="size-5 shrink-0" />
            {t.calendar.weekdays[l.day]} · {fmtKey(date)}
          </div>
          <div className="flex items-center gap-2 text-sm tabular-nums">
            <Clock className="size-4 shrink-0" /> {l.flexible && "~ "}{l.start}–{l.end}
          </div>
          {(before > 0 || after > 0) && (
            <div className="space-y-0.5 border-t border-foreground/10 pt-2 text-[13px] text-foreground/80">
              {before > 0 && <div className="flex items-center gap-1.5"><Car className="size-3.5" /> {t.schedule.panel.travelBefore(before)}</div>}
              {after > 0 && <div className="flex items-center gap-1.5"><Car className="size-3.5" /> {t.schedule.panel.travelAfter(after)}</div>}
            </div>
          )}
          {l.flexible && <p className="text-[13px]">~ {t.schedule.flexibleTag} · {t.schedule.flexibleHint}</p>}
        </section>

        <section className={cn(`note-${person.color} flex items-center gap-3 rounded-2xl border bg-background p-3`)}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-medium" style={{ background: "var(--note-chip)" }}>
            {person.name[0]}
          </span>
          <div className="min-w-0">
            <div className="text-[13px] text-muted-foreground">{t.schedule.panel.person}</div>
            <div className="truncate text-base font-medium">{person.name}</div>
            <div className="text-[13px] text-muted-foreground">{t.schedule.panel.travelPerson(person.travelMin ?? 15)}</div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={<CalendarRange />} label={t.schedule.panel.period}>
            <span className="tabular-nums">{fmtKey(l.from)} → {fmtKey(l.to)}</span>
          </InfoCard>
          <InfoCard icon={<CalendarX2 />} label={t.schedule.panel.excluded}>
            {l.exclude?.length ? l.exclude.map(fmtKey).join(t.listSep) : t.schedule.none}
          </InfoCard>
        </div>

        {mine.length > 1 && (
          <section className="space-y-2">
            <h4 className="text-[15px] font-semibold text-foreground/80">{t.schedule.panel.dayLessons}</h4>
            <ul className="space-y-1.5">
              {mine.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(x.id, date)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border bg-background px-3 py-2 text-start text-sm transition-colors hover:bg-muted/60",
                      x.id === l.id && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <span className="tabular-nums text-sm text-muted-foreground">{x.flexible && "~ "}{x.start}–{x.end}</span>
                    <SubjectBadge subject={x.subject} hue={hues.get(x.subject)} className="text-[13px]" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  })()

  return (
    <SidePanel
      open={!!valid}
      onOpenChange={(o) => !o && onClose()}
      badges={shown && <SubjectBadge subject={shown.lesson.subject} hue={hues.get(shown.lesson.subject)} className="px-3 py-0.5 text-[13px]" />}
      title={shown ? `${byId[shown.lesson.personId].name} · ${shown.lesson.subject}` : null}
      footer={<Button type="button" variant="outline" className={panelBtn} onClick={onClose}>{t.detail.close}</Button>}
    >
      {body}
    </SidePanel>
  )
}
