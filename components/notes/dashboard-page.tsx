"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import { DashboardView } from "./dashboard-view"
import { useShell } from "./app-shell"

export function DashboardPage() {
  const { notes, hydrated } = useNotes()
  const { edit, add, loadDemo } = useShell()
  const router = useRouter()
  if (!hydrated)
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  return (
    <>
      {notes.length === 0 && (
        <div className="clay flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-5xl" aria-hidden>🐰</span>
          <p className="text-sm text-muted-foreground">{t.dashboard.emptyDash}</p>
          <Button onClick={loadDemo}>{t.dashboard.loadDemoUi}</Button>
        </div>
      )}
      <DashboardView onEdit={edit} onAdd={() => add()} onShowNotes={() => router.push("/notes")} />
    </>
  )
}
