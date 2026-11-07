"use client"

import * as React from "react"
import { toast } from "sonner"
import { BellOff, BellRing, Info, Loader2, Send, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { t } from "@/lib/i18n"
import {
  DEFAULT_PREFS,
  OFFSET_CHOICES,
  countDevices,
  disablePush,
  enablePush,
  hasVapidKey,
  isSubscribed,
  loadPrefs,
  needsInstallOnIos,
  permissionState,
  pushSupported,
  savePrefs,
  sendTestPush,
  type ReminderPrefs,
} from "@/lib/push"
import { cn } from "@/lib/utils"

export function ReminderSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [prefs, setPrefs] = React.useState<ReminderPrefs>(DEFAULT_PREFS)
  const [device, setDevice] = React.useState(false) // bu qurulma abone bolghanmu
  const [devices, setDevices] = React.useState(0) // hésabtiki jemiy qurulma
  const [busy, setBusy] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  const supported = pushSupported()
  const iosInstall = needsInstallOnIos()
  const denied = permissionState() === "denied"

  React.useEffect(() => {
    if (!open) return
    let alive = true
    Promise.all([loadPrefs(), isSubscribed(), countDevices().catch(() => 0)])
      .then(([p, sub, n]) => {
        if (!alive) return
        setPrefs(p)
        setDevice(sub)
        setDevices(n)
        setLoaded(true)
      })
      .catch(() => {
        if (alive) toast.error(t.reminders.error)
      })
    return () => {
      alive = false
    }
  }, [open])

  async function persist(next: ReminderPrefs) {
    setPrefs(next)
    try {
      await savePrefs(next)
    } catch {
      toast.error(t.reminders.error)
    }
  }

  async function toggleDevice() {
    setBusy(true)
    try {
      if (device) {
        await disablePush()
        setDevice(false)
        // Bashqa qurulma qalmighan bolsa, hésabtiki hatirlatmini ochurimiz
        const left = await countDevices().catch(() => 1)
        setDevices(left)
        if (left === 0) await persist({ ...prefs, enabled: false })
        return
      }
      const r = await enablePush()
      if (r === "ok") {
        setDevice(true)
        setDevices(await countDevices().catch(() => 1))
        await persist({ ...prefs, enabled: true })
        toast.success(t.reminders.saved)
      } else if (r === "denied") toast.error(t.reminders.denied)
      else if (r === "unsupported") toast.error(t.reminders.unsupported)
      else if (r === "no-key") toast.error(t.reminders.noKey)
      else toast.error(t.reminders.error)
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setTesting(true)
    try {
      if (await sendTestPush()) toast.success(t.reminders.testSent)
      else toast.error(t.reminders.testFailed)
    } finally {
      setTesting(false)
    }
  }

  const toggleOffset = (o: number) => {
    const has = prefs.offsets.includes(o)
    // Eng az bir waqit tallanghan bolsun
    if (has && prefs.offsets.length === 1) return
    void persist({ ...prefs, offsets: (has ? prefs.offsets.filter((x) => x !== o) : [...prefs.offsets, o]).sort((a, b) => a - b) })
  }

  const hint = !supported ? t.reminders.unsupported : iosInstall ? t.reminders.iosInstall : denied ? t.reminders.denied : !hasVapidKey() ? t.reminders.noKey : null
  const canEnable = supported && !iosInstall && !denied && hasVapidKey()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BellRing className="size-5" aria-hidden />
            {t.reminders.title}
          </DialogTitle>
          <DialogDescription>{t.reminders.desc}</DialogDescription>
        </DialogHeader>

        {hint && (
          <p className="flex gap-2 rounded-xl bg-amber-100/70 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {hint}
          </p>
        )}

        {/* Bu qurulmining halití */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              device ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
            )}
            aria-hidden
          >
            {device ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.reminders.device}</p>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {!loaded ? "…" : device ? t.reminders.on : t.reminders.off}
              {loaded && devices > 0 && ` · ${t.reminders.devices(devices)}`}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={device ? "outline" : "default"}
            className="shrink-0 rounded-lg"
            disabled={busy || !loaded || (!device && !canEnable)}
            aria-pressed={device}
            onClick={toggleDevice}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {device ? t.reminders.disable : t.reminders.enable}
          </Button>
        </div>

        {/* Son kün hatirlatmiliri (hésab ayari) */}
        <div className="border-t pt-4">
          <fieldset className="space-y-3" disabled={!loaded}>
            <legend className="w-full text-sm font-medium">
              {t.reminders.deadlineTitle}
              <span className="block text-xs font-normal text-muted-foreground">{t.reminders.deadlineDesc}</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.reminders.when}>
              {OFFSET_CHOICES.map((o) => {
                const on = prefs.offsets.includes(o)
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleOffset(o)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      on ? "border-primary bg-primary/15 font-medium" : "border-input text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.reminders.offset(o)}
                  </button>
                )
              })}
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              {t.reminders.time}
              <Input
                type="time"
                dir="ltr"
                value={prefs.sendTime}
                onChange={(e) => e.target.value && void persist({ ...prefs, sendTime: e.target.value })}
                className="h-9 w-32"
              />
            </label>
          </fieldset>
        </div>

        <p className="flex gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="mt-px size-4 shrink-0" aria-hidden />
          {t.reminders.perNote}
        </p>

        <div className="space-y-1.5">
          <Button type="button" variant="outline" className="h-11 w-full rounded-xl" disabled={testing || busy || !device} onClick={test}>
            {testing ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            {t.reminders.test}
          </Button>
          {loaded && !device && <p className="text-center text-xs text-muted-foreground">{t.reminders.testHint}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
