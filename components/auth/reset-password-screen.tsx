"use client"

import * as React from "react"
import { KeyRound, Lock, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { IconInput } from "./icon-input"
import { supabase } from "@/lib/supabase/client"
import { LanguageSwitcher } from "@/components/i18n-provider"
import { t } from "@/lib/i18n"

const MIN_PASSWORD = 6

/** Élxettiki "mexpiy shifirni eslige keltürüsh" ulinishi échilghanda körsitilidu (AuthGate: PASSWORD_RECOVERY). */
export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = React.useState("")
  const [password2, setPassword2] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(t.login.weak)
    if (password !== password2) return setError(t.login.mismatch)
    setBusy(true)
    const { error } = await supabase().auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.code === "weak_password" ? t.login.weak : t.login.updateFailed)
    toast.success(t.login.passwordChanged)
    onDone()
  }

  return (
    <main className="app-bg flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-6 shadow-lg ring-1 ring-foreground/10"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-xl font-medium">{t.login.newPasswordTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.login.newPasswordSubtitle}</p>
        </div>
        <LanguageSwitcher />
        <div className="space-y-2">
          <IconInput
            icon={Lock}
            type="password"
            autoFocus
            autoComplete="new-password"
            placeholder={t.login.newPassword}
            value={password}
            aria-invalid={!!error}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
          />
          <IconInput
            icon={KeyRound}
            type="password"
            autoComplete="new-password"
            placeholder={t.login.confirmPassword}
            value={password2}
            aria-invalid={!!error}
            onChange={(e) => {
              setPassword2(e.target.value)
              setError(null)
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy || !password || !password2}>
          <Save data-icon="inline-start" />
          {t.login.savePassword}
        </Button>
      </form>
    </main>
  )
}
