"use client"

import * as React from "react"
import { isAuthed, setAuthed, logout } from "@/lib/auth"
import { LoginScreen } from "./login-screen"

const AuthCtx = React.createContext<{ logout: () => void }>({ logout: () => {} })
export const useAuth = () => React.useContext(AuthCtx)

export function AuthGate({ children }: { children: React.ReactNode }) {
  const hydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [override, setState] = React.useState<"out" | "in" | null>(null)
  const state = !hydrated ? "checking" : (override ?? (isAuthed() ? "in" : "out"))

  if (state === "checking") return null
  if (state === "out")
    return (
      <LoginScreen
        onSuccess={() => {
          setAuthed()
          setState("in")
        }}
      />
    )
  return (
    <AuthCtx.Provider
      value={{
        logout: () => {
          logout()
          setState("out")
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  )
}
