"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/components/auth/auth-gate"
import { t } from "@/lib/i18n"
import { demoNotes } from "@/lib/demo"
import { emptyFilters, filterNotes, isOverdue, sortNotes, type Filters, type SortBy } from "@/lib/filters"
import { NotesProvider, useNotes } from "@/lib/notes-store"
import { loadView, saveView } from "@/lib/storage"
import type { Note, Status, ViewMode } from "@/lib/types"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { CommandSearch } from "./command-search"
import { useImportExport } from "./import-export"
import { NoteDialog, type DialogTarget } from "./note-dialog"

type Shell = {
  filters: Filters
  setFilters: (f: Filters) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  view: ViewMode
  setView: (v: ViewMode) => void
  visible: Note[]
  edit: (n: Note) => void
  add: (status?: Status, deadline?: string) => void
  askDelete: (n: Note) => void
  loadDemo: () => void
}

const ShellCtx = React.createContext<Shell | null>(null)
export function useShell() {
  const v = React.useContext(ShellCtx)
  if (!v) throw new Error("useShell must be used inside AppShell")
  return v
}

function Inner({ children }: { children: React.ReactNode }) {
  const { notes, hydrated, remove, importMerge } = useNotes()
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { doExport, doExportCsv, pickFile, ui: importUi } = useImportExport()
  const [filters, setFilters] = React.useState<Filters>(emptyFilters)
  const [sortBy, setSortBy] = React.useState<SortBy>("updated")
  const [viewOverride, setViewState] = React.useState<ViewMode | null>(null)
  const view: ViewMode = viewOverride ?? (hydrated ? loadView() : "kanban")
  const [target, setTarget] = React.useState<DialogTarget>(null)
  const [toDelete, setToDelete] = React.useState<Note | null>(null)
  const [cmdOpen, setCmdOpen] = React.useState(false)

  const setView = (v: ViewMode) => {
    setViewState(v)
    saveView(v)
  }
  const visible = React.useMemo(
    () => sortNotes(filterNotes(notes, filters), sortBy),
    [notes, filters, sortBy]
  )
  const loadDemo = () => {
    importMerge(demoNotes())
    toast.success(t.dashboard.demoLoaded)
  }
  const edit = (n: Note) => setTarget({ note: n })
  const add = (status?: Status, deadline?: string) => setTarget({ status, deadline })
  const onNotesPage = pathname.startsWith("/notes")

  const ctx: Shell = {
    filters, setFilters, sortBy, setSortBy, view, setView, visible,
    edit, add, askDelete: setToDelete, loadDemo,
  }

  return (
    <ShellCtx.Provider value={ctx}>
      <SidebarProvider>
        <AppSidebar
          notes={notes}
          onExport={doExport}
          onExportCsv={doExportCsv}
          onDemo={loadDemo}
          onImport={pickFile}
          onLogout={logout}
        />
        <SidebarInset className="app-bg min-w-0 bg-transparent">
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            <AppHeader
              title={onNotesPage ? t.notes : pathname.startsWith("/calendar") ? t.calendar.title : t.dashboard.greeting}
              subtitle={onNotesPage ? undefined : pathname.startsWith("/calendar") ? t.calendar.subtitle : t.dashboard.subtitle}
              overdue={notes.filter(isOverdue).length}
              onBell={() => {
                setFilters({ ...emptyFilters, deadline: "overdue" })
                router.push("/notes")
              }}
              query={filters.query}
              setQuery={(query) => {
                setFilters({ ...filters, query })
                if (query && !onNotesPage) router.push("/notes")
              }}
            />
            {children}
          </div>
        </SidebarInset>

        <NoteDialog target={target} onClose={() => setTarget(null)} />
        <CommandSearch
          open={cmdOpen}
          setOpen={setCmdOpen}
          notes={notes}
          onOpenNote={edit}
          onNew={() => add()}
          setView={(v) => {
            setView(v)
            router.push("/notes")
          }}
          onExport={doExport}
          onExportCsv={doExportCsv}
        />
        {importUi}

        <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteConfirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{t.deleteConfirm.desc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setToDelete(null)}>{t.deleteConfirm.cancel}</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (toDelete) remove(toDelete.id)
                  setToDelete(null)
                }}
              >
                {t.deleteConfirm.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarProvider>
    </ShellCtx.Provider>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <Inner>{children}</Inner>
    </NotesProvider>
  )
}
