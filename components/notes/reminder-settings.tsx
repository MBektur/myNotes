"use client"

import * as React from "react"
import { toast } from "sonner"
import { BellRing } from "lucide-react"
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
  const [busy, setBusy] = React.useState(false)
  const [loaded, setLoaded] = React.useState(false)

  const supported = pushSupported()
  const iosInstall = needsInstallOnIos()
  const denied = permissionState() === "denied"

  React.useEffect(() => {
    if (!open) return
    let alive = true
    Promise.all([loadPrefs(), isSubscribed()])
      .then(([p, sub]) => {
        if (!alive) return
        setPrefs(p)
        setDevice(sub)
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
        if ((await countDevices().catch(() => 1)) === 0) await persist({ ...prefs, enabled: false })
        return
      }
      const r = await enablePush()
      if (r === "ok") {
        setDevice(true)
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
    setBusy(true)
    try {
      if (await sendTestPush()) toast.success(t.reminders.testSent)
      else toast.error(t.reminders.testFailed)
    } finally {
      setBusy(false)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BellRing className="size-5" aria-hidden />
            {t.reminders.title}
          </DialogTitle>
          <DialogDescription>{t.reminders.desc}</DialogDescription>
        </DialogHeader>

        {hint && <p className="rounded-xl bg-amber-100/70 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">{hint}</p>}

        <Button
          type="button"
          variant={device ? "secondary" : "default"}
          className="h-11 rounded-xl"
          disabled={busy || !loaded || (!device && !canEnable)}
          aria-pressed={device}
          onClick={toggleDevice}
        >
          {device ? `✓ ${t.reminders.enabled}` : t.reminders.enable}
        </Button>

        <fieldset className="space-y-2" disabled={!loaded}>
          <legend className="text-sm font-medium">{t.reminders.when}</legend>
          <div className="flex flex-wrap gap-2">
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
        </fieldset>

        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          {t.reminders.time}
          <Input
            type="time"
            dir="ltr"
            value={prefs.sendTime}
            disabled={!loaded}
            onChange={(e) => e.target.value && void persist({ ...prefs, sendTime: e.target.value })}
            className="h-10 w-32"
          />
        </label>

        <Button type="button" variant="outline" className="h-11 rounded-xl" disabled={busy || !device} onClick={test}>
          {t.reminders.test}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
