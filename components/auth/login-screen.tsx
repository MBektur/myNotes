"use client"

import * as React from "react"
import { NotebookPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client"
import { t } from "@/lib/i18n"

export function LoginScreen() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    // Uğurluq bolsa AuthGate onAuthStateChange arqiliq özi yéngilinidu
    if (error) setError(true)
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
        {!isSupabaseConfigured ? (
          <p className="text-center text-sm text-destructive">{t.login.notConfigured}</p>
        ) : (
          <>
            <div className="space-y-2">
              <Input
                type="email"
                dir="ltr"
                autoFocus
                autoComplete="email"
                placeholder={t.login.email}
                value={email}
                aria-invalid={error}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(false)
                }}
              />
              <Input
                type="password"
                dir="ltr"
                autoComplete="current-password"
                placeholder={t.login.password}
                value={password}
                aria-invalid={error}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(false)
                }}
              />
              {error && <p className="text-sm text-destructive">{t.login.wrong}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy || !email || !password}>
              {t.login.submit}
            </Button>
          </>
        )}
      </form>
    </main>
  )
}
