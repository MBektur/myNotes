"use client"

import * as React from "react"
import { addDays, format, parseISO } from "date-fns"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { t } from "@/lib/i18n"
import { DEFAULT_PREFS, isSubscribed, loadPrefs } from "@/lib/push"
import { newId, type Reminder, type ReminderRepeat, type ReminderUnit } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  MAX_EVERY,
  MAX_REMINDERS,
  REMINDER_UNITS,
  fromMin,
  nextOccurrence,
  toMin,
} from "@/supabase/functions/send-reminders/occurrence"

type Kind = "none" | "daily" | "weekly" | "monthly" | "custom"
const KINDS: readonly Kind[] = ["none", "daily", "weekly", "monthly", "custom"]
const PRESET: Record<Exclude<Kind, "none" | "custom">, ReminderRepeat> = {
  daily: { every: 1, unit: "day" },
  weekly: { every: 1, unit: "week" },
  monthly: { every: 1, unit: "month" },
}

function kindOf(r?: ReminderRepeat): Kind {
  if (!r) return "none"
  if (r.every !== 1) return "custom"
  return r.unit === "day" ? "daily" : r.unit === "week" ? "weekly" : r.unit === "month" ? "monthly" : "custom"
}

const stamp = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")
const show = (s: string) => s.replace("T", " ")

const chip =
  "inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:pointer-events-none disabled:opacity-50"

/** "Her N" sani: yézish jeryanida bosh qalsa bolidu, peqet toghra san saqlinidu. */
function EveryInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = React.useState<string | null>(null) // null = yézilmawatidu, value körsitilidu
  return (
    <Input
      type="number"
      inputMode="numeric"
      dir="ltr"
      min={1}
      max={MAX_EVERY}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number.parseInt(e.target.value, 10)
        if (Number.isInteger(n) && n >= 1 && n <= MAX_EVERY) onChange(n)
      }}
      onBlur={() => setDraft(null)}
      className="h-8 w-20"
      aria-label={t.alarm.every}
    />
  )
}

function Row({ r, onChange, onRemove }: { r: Reminder; onChange: (r: Reminder) => void; onRemove: () => void }) {
  // "Özel" tallanghanda, san 1'ge qaytsimu (mes. "her 1 kün") meydanlar yoqalmisun
  const [custom, setCustom] = React.useState(kindOf(r.repeat) === "custom")
  const kind: Kind = custom ? "custom" : kindOf(r.repeat)

  const nowMin = toMin(stamp(new Date()))!
  const next = nextOccurrence(r, nowMin)

  function setKind(k: Kind) {
    setCustom(k === "custom")
    if (k === "none") onChange({ id: r.id, at: r.at })
    else if (k === "custom") onChange({ ...r, repeat: r.repeat ?? { every: 2, unit: "day" } })
    else onChange({ ...r, repeat: PRESET[k] })
  }

  return (
    <li className="space-y-1.5 rounded-lg border border-input p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          type="datetime-local"
          dir="ltr"
          value={r.at}
          onChange={(e) => e.target.value && onChange({ ...r, at: e.target.value.slice(0, 16) })}
          className="h-8 min-w-0 flex-1 basis-44"
          aria-label={t.alarm.label}
        />
        <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <SelectTrigger className="h-8 min-w-0 flex-1 basis-32" aria-label={t.alarm.repeat}>
            <SelectValue>{(v: string) => t.alarm.repeats[v as Kind]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>{t.alarm.repeats[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.alarm.remove}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {kind === "custom" && r.repeat && (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">{t.alarm.every}</span>
          <EveryInput value={r.repeat.every} onChange={(every) => onChange({ ...r, repeat: { ...r.repeat!, every } })} />
          <Select value={r.repeat.unit} onValueChange={(v) => onChange({ ...r, repeat: { ...r.repeat!, unit: v as ReminderUnit } })}>
            <SelectTrigger className="h-8" aria-label={t.alarm.repeat}>
              <SelectValue>{(v: string) => t.alarm.units[v as ReminderUnit]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REMINDER_UNITS.map((u) => (
                <SelectItem key={u} value={u}>{t.alarm.units[u]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <p className={cn("px-0.5 text-xs", next === null ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
        {next === null ? (
          t.alarm.past
        ) : (
          <>
            {t.alarm.next}:{" "}
            <span dir="ltr" className="tabular-nums">{show(fromMin(next))}</span>
            {r.repeat && ` · ${t.alarm.everyN(r.repeat.every, r.repeat.unit)}`}
          </>
        )}
      </p>
    </li>
  )
}

/** Nota xas hatirlatmilar tehriri (kontrollanidighan): waqit + tekrar, birnechchisi bolalaydu. */
export function ReminderEditor({
  value,
  onChange,
  deadline,
}: {
  value: Reminder[]
  onChange: (v: Reminder[]) => void
  deadline?: string
}) {
  const [sendTime, setSendTime] = React.useState(DEFAULT_PREFS.sendTime)
  const [pushOff, setPushOff] = React.useState(false)

  // Hésab ayaridiki saet (kisayollar üchün) we bu qurulmida bildirish ochuqmu
  React.useEffect(() => {
    let alive = true
    loadPrefs()
      .then((p) => alive && setSendTime(p.sendTime))
      .catch(() => {})
    isSubscribed() // qollimaydighan brauzerde false
      .then((s) => alive && setPushOff(!s))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const full = value.length >= MAX_REMINDERS
  const add = (at: string) => !full && onChange([...value, { id: newId(), at }])
  const atTime = (d: Date) => `${format(d, "yyyy-MM-dd")}T${sendTime}`

  // "Qoshush": kéyinki pütün saet (14:23 -> 15:00)
  const nextHour = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    return stamp(d)
  }
  const quick: { label: string; at: () => string }[] = [{ label: t.alarm.tomorrow(sendTime), at: () => atTime(addDays(new Date(), 1)) }]
  const fromDeadline = deadline
    ? [0, 1, 7].map((o) => ({ label: t.reminders.offset(o), at: () => atTime(addDays(parseISO(deadline), -o)) }))
    : []

  return (
    <div className="space-y-2">
      {value.length > 0 && pushOff && (
        <p className="rounded-lg bg-amber-100/70 p-2 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{t.alarm.pushOff}</p>
      )}

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((r) => (
            <Row
              key={r.id}
              r={r}
              onChange={(nr) => onChange(value.map((x) => (x.id === r.id ? nr : x)))}
              onRemove={() => onChange(value.filter((x) => x.id !== r.id))}
            />
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={chip} disabled={full} onClick={() => add(nextHour())}>
          <Plus className="size-3.5" /> {t.alarm.add}
        </button>
        {quick.map((q) => (
          <button key={q.label} type="button" className={chip} disabled={full} onClick={() => add(q.at())}>
            {q.label}
          </button>
        ))}
      </div>
      {fromDeadline.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t.alarm.fromDeadline}</span>
          {fromDeadline.map((q) => (
            <button key={q.label} type="button" className={chip} disabled={full} onClick={() => add(q.at())}>
              {q.label}
            </button>
          ))}
        </div>
      )}
      {full && <p className="text-xs text-muted-foreground">{t.alarm.limit(MAX_REMINDERS)}</p>}
    </div>
  )
}
