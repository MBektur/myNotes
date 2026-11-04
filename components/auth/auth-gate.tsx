"use client"

import * as React from "react"
import { clearUserCache, isSupabaseConfigured, supabase } from "@/lib/supabase/client"
import { initSchedule } from "@/lib/schedule-store"
import { LoginScreen } from "./login-screen"

const AuthCtx = React.createContext<{ logout: () => void }>({ logout: () => {} })
export const useAuth = () => React.useContext(AuthCtx)

type State = "checking" | "in" | "out"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(isSupabaseConfigured ? "checking" : "out")

  React.useEffect(() => {
    if (!isSupabaseConfigured) return
    const db = supabase()
    db.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"))
    const { data } = db.auth.onAuthStateChange((_e, session) => {
      clearUserCache()
      setState(session ? "in" : "out")
    })
    return () => data.subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    if (state === "in") void initSchedule()
  }, [state])

  const logout = React.useCallback(() => {
    void supabase().auth.signOut()
  }, [])

  if (state === "checking") return null
  if (state === "out") return <LoginScreen />
  return <AuthCtx.Provider value={{ logout }}>{children}</AuthCtx.Provider>
}
