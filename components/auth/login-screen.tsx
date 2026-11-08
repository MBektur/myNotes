"use client"

import * as React from "react"
import { ArrowLeft, ArrowRight, KeyRound, Lock, LogIn, Mail, MailCheck, NotebookPen, Send, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconInput } from "./icon-input"
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client"
import { LanguageSwitcher } from "@/components/i18n-provider"
import { getDir, t } from "@/lib/i18n"

type Mode = "signin" | "signup" | "forgot"

const MIN_PASSWORD = 6

export function LoginScreen() {
  const [mode, setMode] = React.useState<Mode>("signin")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [password2, setPassword2] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function go(next: Mode) {
    setMode(next)
    setError(null)
    setSent(null)
    setPassword("")
    setPassword2("")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const addr = email.trim()
    setError(null)
    setBusy(true)
    const auth = supabase().auth
    try {
      if (mode === "signin") {
        const { error } = await auth.signInWithPassword({ email: addr, password })
        // Uğurluq bolsa AuthGate onAuthStateChange arqiliq özi yéngilinidu
        if (error) setError(t.login.wrong)
      } else if (mode === "signup") {
        if (password.length < MIN_PASSWORD) return setError(t.login.weak)
        if (password !== password2) return setError(t.login.mismatch)
        const { data, error } = await auth.signUp({
          email: addr,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) setError(error.code === "weak_password" ? t.login.weak : t.login.signUpFailed)
        // Élxet jezmlesh ochuq bolsa session kelmeydu ("élxetni tekshürüng" körsitilidu); bolmisa AuthGate özi kirgüzidu.
        else if (!data.session) setSent(t.login.checkEmail(addr))
      } else {
        // Hésab bolmisa élxet yollimaymiz. Fonksiye téxi qurulmighan (0007) yaki xata bolsa tosmaymiz, yollaymiz.
        const { data: exists, error: checkError } = await supabase().rpc("email_exists", { addr })
        if (!checkError && exists === false) return setError(t.login.noSuchAccount)
        const { error } = await auth.resetPasswordForEmail(addr, { redirectTo: window.location.origin })
        if (error) setError(t.login.sendFailed)
        else setSent(t.login.linkSent(addr))
      }
    } finally {
      setBusy(false)
    }
  }

  const title = mode === "signup" ? t.login.signUpTitle : mode === "forgot" ? t.login.forgotTitle : t.appName
  const subtitle =
    mode === "signup" ? t.login.signUpSubtitle : mode === "forgot" ? t.login.forgotSubtitle : t.login.subtitle
  const submitLabel = mode === "signup" ? t.login.signUp : mode === "forgot" ? t.login.sendLink : t.login.submit
  const SubmitIcon = mode === "signup" ? UserPlus : mode === "forgot" ? Send : LogIn
  const canSubmit =
    !busy && !!email && (mode === "forgot" || !!password) && (mode !== "signup" || !!password2)
  const BackIcon = getDir() === "rtl" ? ArrowRight : ArrowLeft
  const linkClass = "inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"

  return (
    <main className="app-bg flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-card p-6 shadow-lg ring-1 ring-foreground/10"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {sent ? <MailCheck className="size-6" /> : <NotebookPen className="size-6" />}
          </div>
          <h1 className="text-xl font-medium">{sent && mode === "signup" ? t.login.checkEmailTitle : title}</h1>
          <p className="text-sm text-muted-foreground">{sent ?? subtitle}</p>
        </div>
        <LanguageSwitcher />
        {!isSupabaseConfigured ? (
          <p className="text-center text-sm text-destructive">{t.login.notConfigured}</p>
        ) : sent ? (
          <Button type="button" className="w-full" onClick={() => go("signin")}>
            <LogIn data-icon="inline-start" />
            {t.login.backToLogin}
          </Button>
        ) : (
          <>
            <div className="space-y-2">
              <IconInput
                icon={Mail}
                type="email"
                autoFocus
                autoComplete="email"
                placeholder={t.login.email}
                value={email}
                aria-invalid={!!error}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
              />
              {mode !== "forgot" && (
                <IconInput
                  icon={Lock}
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={t.login.password}
                  value={password}
                  aria-invalid={!!error}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                />
              )}
              {mode === "signup" && (
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
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              <SubmitIcon data-icon="inline-start" />
              {submitLabel}
            </Button>
            <div className="flex flex-col items-center gap-2">
              {mode === "signin" && (
                <>
                  <button type="button" className={linkClass} onClick={() => go("forgot")}>
                    <KeyRound className="size-3.5" />
                    {t.login.forgot}
                  </button>
                  <button type="button" className={linkClass} onClick={() => go("signup")}>
                    <UserPlus className="size-3.5" />
                    {t.login.noAccount}
                  </button>
                </>
              )}
              {mode === "signup" && (
                <button type="button" className={linkClass} onClick={() => go("signin")}>
                  <LogIn className="size-3.5" />
                  {t.login.haveAccount}
                </button>
              )}
              {mode === "forgot" && (
                <button type="button" className={linkClass} onClick={() => go("signin")}>
                  <BackIcon className="size-3.5" />
                  {t.login.backToLogin}
                </button>
              )}
            </div>
          </>
        )}
      </form>
    </main>
  )
}
