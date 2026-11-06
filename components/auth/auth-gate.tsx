"use client"

import * as React from "react"
import { clearUserCache, isSupabaseConfigured, supabase } from "@/lib/supabase/client"
import { initSchedule } from "@/lib/schedule-store"
import { initWorkspaces } from "@/lib/workspaces-store"
import { clearCaches } from "@/lib/cache"
import { disablePush, refreshSubscription } from "@/lib/push"
import { LoginScreen } from "./login-screen"
import { ResetPasswordScreen } from "./reset-password-screen"
import { Splash } from "./splash"

const AuthCtx = React.createContext<{ logout: () => void | Promise<void> }>({ logout: () => {} })
export const useAuth = () => React.useContext(AuthCtx)

type State = "checking" | "in" | "out" | "recovery"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(isSupabaseConfigured ? "checking" : "out")

  // Şifre sıfırlama bağlantısı ile gelindiyse oturum açılır ama uygulama yerine yeni şifre ekranı gösterilir.
  const recovering = React.useRef(false)

  React.useEffect(() => {
    if (!isSupabaseConfigured) return
    const db = supabase()
    if (window.location.hash.includes("type=recovery")) recovering.current = true
    db.auth.getSession().then(({ data }) => {
      if (!data.session) recovering.current = false
      setState(recovering.current ? "recovery" : data.session ? "in" : "out")
    })
    const { data } = db.auth.onAuthStateChange((event, session) => {
      clearUserCache()
      if (!session) clearCaches()
      if (event === "PASSWORD_RECOVERY") recovering.current = true
      if (recovering.current && session) return setState("recovery")
      recovering.current = false
      setState(session ? "in" : "out")
    })
    return () => data.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (state === "in") {
      void initSchedule()
      void initWorkspaces()
      void refreshSubscription()
    }
  }, [state])

  const logout = React.useCallback(async () => {
    // Aldi bilen bu qurulmining push aboneligini öchürimiz (oturum bar waqitta); bolmisa bashqa hésab bu qurulmigha bildirish alidu
    await disablePush()
    await supabase().auth.signOut()
  }, [])

  if (state === "checking") return <Splash />
  if (state === "out") return <LoginScreen />
  if (state === "recovery")
    return (
      <ResetPasswordScreen
        onDone={() => {
          recovering.current = false
          setState("in")
        }}
      />
    )
  return <AuthCtx.Provider value={{ logout }}>{children}</AuthCtx.Provider>
}
