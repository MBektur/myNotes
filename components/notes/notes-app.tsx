"use client"

import * as React from "react"
import { NotebookPen } from "lucide-react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/components/auth/auth-gate"
import { t } from "@/lib/i18n"
import { emptyFilters, filterNotes, isOverdue, sortNotes, type Filters, type SortBy } from "@/lib/filters"
import { demoNotes } from "@/lib/demo"
import { NotesProvider, useNotes } from "@/lib/notes-store"
import { loadPage, loadView, savePage, saveView, type Page } from "@/lib/storage"
import type { Note, Status, ViewMode } from "@/lib/types"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { CardView } from "./card-view"
import { DashboardView } from "./dashboard-view"
import { CommandSearch } from "./command-search"
import { useImportExport } from "./import-export"
import { KanbanView } from "./kanban-view"
import { ListView } from "./list-view"
import { NoteDialog, type DialogTarget } from "./note-dialog"
import { Toolbar } from "./toolbar"

function Inner() {
  const { notes, hydrated, remove, importMerge } = useNotes()
  const { logout } = useAuth()
  const { doExport, pickFile, ui: importUi } = useImportExport()
  const [filters, setFilters] = React.useState<Filters>(emptyFilters)
  const [sortBy, setSortBy] = React.useState<SortBy>("updated")
  const [viewOverride, setViewState] = React.useState<ViewMode | null>(null)
  const view: ViewMode = viewOverride ?? (hydrated ? loadView() : "kanban")
  const [target, setTarget] = React.useState<DialogTarget>(null)
  const [toDelete, setToDelete] = React.useState<Note | null>(null)
  const [cmdOpen, setCmdOpen] = React.useState(false)

  const [pageOverride, setPageState] = React.useState<Page | null>(null)
  const page: Page = pageOverride ?? (hydrated ? loadPage() : "dashboard")
  const setPage = (p: Page) => {
    setPageState(p)
    savePage(p)
  }
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
  const onEdit = (n: Note) => setTarget({ note: n })
  const onAdd = (status?: Status) => setTarget({ status })

  return (
    <SidebarProvider>
      <AppSidebar
        notes={notes}
        filters={filters}
        setFilters={(f) => {
          setFilters(f)
          setPage("notes")
        }}
        page={page}
        setPage={setPage}
        onExport={doExport}
        onDemo={loadDemo}
        onImport={pickFile}
        onLogout={logout}
      />
      <SidebarInset className="app-bg min-w-0 bg-transparent">
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <AppHeader
            title={page === "dashboard" ? t.dashboard.greeting : t.notes}
            subtitle={page === "dashboard" ? t.dashboard.subtitle : undefined}
            overdue={notes.filter(isOverdue).length}
            onBell={() => {
              setFilters({ ...emptyFilters, deadline: "overdue" })
              setPage("notes")
            }}
            query={filters.query}
            setQuery={(query) => {
              setFilters({ ...filters, query })
              if (query) setPage("notes")
            }}
          />
          {page === "dashboard" ? (
            hydrated && notes.length === 0 && (
              <div className="clay flex flex-col items-center gap-3 py-12 text-center">
                <span className="text-5xl" aria-hidden>🐰</span>
                <p className="text-sm text-muted-foreground">{t.dashboard.emptyDash}</p>
                <Button onClick={loadDemo}>{t.dashboard.loadDemoUi}</Button>
              </div>
            )
          ) : null}
          {page === "dashboard" ? (
            hydrated && <DashboardView onEdit={onEdit} onAdd={() => onAdd()} onShowNotes={() => setPage("notes")} />
          ) : (
          <>
          <Toolbar
            notes={notes}
            filters={filters}
            setFilters={setFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            view={view}
            setView={setView}
            onNew={() => onAdd()}
          />

          {!hydrated ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : view === "kanban" ? (
            <KanbanView notes={visible} onEdit={onEdit} onDelete={setToDelete} onAdd={onAdd} />
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card/60 py-16 text-center">
              <NotebookPen className="size-8 text-muted-foreground" />
              <p className="font-medium">{t.empty}</p>
              <p className="text-sm text-muted-foreground">{t.emptyHint}</p>
            </div>
          ) : view === "card" ? (
            <CardView notes={visible} onEdit={onEdit} onDelete={setToDelete} />
          ) : (
            <ListView notes={visible} onEdit={onEdit} onDelete={setToDelete} />
          )}
          </>
          )}
        </div>
      </SidebarInset>

      <NoteDialog target={target} onClose={() => setTarget(null)} />
      <CommandSearch
        open={cmdOpen}
        setOpen={setCmdOpen}
        notes={notes}
        onOpenNote={onEdit}
        onNew={() => onAdd()}
        setView={setView}
        onExport={doExport}
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
  )
}

export function NotesApp() {
  return (
    <NotesProvider>
      <Inner />
    </NotesProvider>
  )
}
