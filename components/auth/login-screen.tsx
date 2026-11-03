"use client"

import * as React from "react"
import { NotebookPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { checkPassword } from "@/lib/auth"
import { t } from "@/lib/i18n"

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const ok = await checkPassword(value)
    setBusy(false)
    if (ok) onSuccess()
    else setError(true)
  }

  return (
    <main className="app-bg flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-6 shadow-lg ring-1 ring-foreground/10"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <NotebookPen className="size-6" />
          </div>
          <h1 className="text-xl font-medium">{t.appName}</h1>
          <p className="text-sm text-muted-foreground">{t.login.subtitle}</p>
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            dir="ltr"
            autoFocus
            autoComplete="current-password"
            placeholder={t.login.password}
            value={value}
            aria-invalid={error}
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
          />
          {error && <p className="text-sm text-destructive">{t.login.wrong}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy || !value}>
          {t.login.submit}
        </Button>
      </form>
    </main>
  )
}
