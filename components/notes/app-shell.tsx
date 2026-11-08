"use client"

import * as React from "react"
import { ViewTransition } from "react"
import dynamic from "next/dynamic"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuth } from "@/components/auth/auth-gate"
import { t } from "@/lib/i18n"
import { demoNotes } from "@/lib/demo"
import { currentUserId } from "@/lib/supabase/client"
import {
  SORT_DEFAULT_DIR,
  emptyFilters,
  filterNotes,
  isOverdue,
  sortNotes,
  type Filters,
  type SortBy,
  type SortDir,
} from "@/lib/filters"
import { NotesProvider, useNotes } from "@/lib/notes-store"
import { loadSort, loadSortDir, loadView, saveSort, saveSortDir, saveView } from "@/lib/storage"
import { useWorkspaces } from "@/lib/workspaces-store"
import type { Note, Status, ViewMode } from "@/lib/types"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { DeleteFlow } from "./archive-dialogs"
import { useImportExport } from "./import-export"
import { useScheduleIo } from "./schedule-io"
import { MobileBottomNav } from "./mobile-bottom-nav"
import type { DialogTarget } from "./note-dialog"

// Aghir, hemme sehipide kerek bolmaydighan bölekler: chéqilghanda yüklinidu (dastlepki JS kichik bolsun).
const NoteDetailPanel = dynamic(() => import("./note-detail").then((m) => m.NoteDetailPanel), { ssr: false })
const NoteDialog = dynamic(() => import("./note-dialog").then((m) => m.NoteDialog), { ssr: false })
const ReminderSettings = dynamic(() => import("./reminder-settings").then((m) => m.ReminderSettings), { ssr: false })
const CommandSearch = dynamic(() => import("./command-search").then((m) => m.CommandSearch), { ssr: false })

// Sehipe almishish animatsiyasi peqet keng ékranda (md+). Telefonda View Transition bashlansa, brauzér pütün sehipening
// körünüshini "chong viewport" ölchimide chizidu we astida qadalghan menyu animatsiye jeryanida körünmey qalidu.
const DESKTOP_MQ = "(min-width: 768px)"
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(DESKTOP_MQ)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
const useIsDesktop = () =>
  React.useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_MQ).matches, () => false)

type Shell = {
  filters: Filters
  setFilters: (f: Filters) => void
  sortBy: SortBy
  setSortBy: (s: SortBy) => void
  sortDir: SortDir
  setSortDir: (d: SortDir) => void
  view: ViewMode
  setView: (v: ViewMode) => void
  visible: Note[]
  edit: (n: Note) => void
  open: (n: Note) => void
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
  const { notes, archived, hydrated, importMerge } = useNotes()
  const { logout } = useAuth()
  const workspaces = useWorkspaces()
  const router = useRouter()
  const pathname = usePathname()
  const isDesktop = useIsDesktop()
  const { doExport, doExportCsv, pickFile, ui: importUi } = useImportExport()
  const scheduleIo = useScheduleIo()
  const [filters, setFilters] = React.useState<Filters>(emptyFilters)
  const [sortOverride, setSortState] = React.useState<SortBy | null>(null)
  const sortBy: SortBy = sortOverride ?? (hydrated ? loadSort() : "priority")
  // Tertip almashqanda yönilish shu tertipning eslidiki yönilishige qaytidu
  const [dirOverride, setDirState] = React.useState<SortDir | null>(null)
  const sortDir: SortDir = dirOverride ?? (hydrated ? loadSortDir() : null) ?? SORT_DEFAULT_DIR[sortBy]
  const setSortBy = (s: SortBy) => {
    setSortState(s)
    saveSort(s)
    setDirState(SORT_DEFAULT_DIR[s])
    saveSortDir(SORT_DEFAULT_DIR[s])
  }
  const setSortDir = (d: SortDir) => {
    setDirState(d)
    saveSortDir(d)
  }
  const [viewOverride, setViewState] = React.useState<ViewMode | null>(null)
  const view: ViewMode = viewOverride ?? (hydrated ? loadView() : "kanban")
  const [target, setTarget] = React.useState<DialogTarget>(null)
  const [detail, setDetail] = React.useState<Note | null>(null)
  const [toDelete, setToDelete] = React.useState<Note | null>(null)
  const [cmdOpen, setCmdOpen] = React.useState(false)
  const [remOpen, setRemOpen] = React.useState(false)

  const setView = (v: ViewMode) => {
    setViewState(v)
    saveView(v)
  }
  const wsNames = React.useMemo(() => new Map(workspaces.map((w) => [w.id, w.name])), [workspaces])
  const visible = React.useMemo(
    () => sortNotes(filterNotes(notes, filters, wsNames), sortBy, sortDir),
    [notes, filters, sortBy, sortDir, wsNames]
  )

  // Öchürülgen workspace süzgüchte qalip qalmisun (aldin körülgenlerge qarap, yüklinish jeryanidiki bosh tizimlik xata sanalmisun)
  const knownWs = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    const now = new Set(workspaces.map((w) => w.id))
    const gone = [...knownWs.current].filter((id) => !now.has(id))
    knownWs.current = now
    if (!gone.length) return
    setFilters((f) =>
      f.workspaces.some((id) => gone.includes(id))
        ? { ...f, workspaces: f.workspaces.filter((id) => !gone.includes(id)) }
        : f
    )
  }, [workspaces])
  const loadDemo = async () => {
    importMerge(demoNotes(await currentUserId()))
    toast.success(t.dashboard.demoLoaded)
  }
  const edit = (n: Note) => setTarget({ note: n })
  const open = (n: Note) => setDetail(n)

  // Bildirishqa chékilghanda: /notes#note=<id> -> shu xatirini échish (sehipe achqanda we ochuq ilovida)
  const notesRef = React.useRef(notes)
  React.useEffect(() => {
    notesRef.current = notes
  })
  const openFromHash = React.useCallback(() => {
    const id = new URLSearchParams(window.location.hash.slice(1)).get("note")
    if (!id) return
    const n = notesRef.current.find((x) => x.id === id)
    if (!n) return
    setDetail(n)
    history.replaceState(null, "", window.location.pathname + window.location.search)
  }, [])
  React.useEffect(() => {
    if (hydrated) openFromHash()
  }, [hydrated, notes.length, openFromHash])
  React.useEffect(() => {
    window.addEventListener("hashchange", openFromHash)
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "open-url" || typeof e.data.url !== "string") return
      const u = new URL(e.data.url, window.location.origin)
      if (u.pathname !== window.location.pathname) router.push(u.pathname + u.hash)
      else if (u.hash) window.location.hash = u.hash
    }
    navigator.serviceWorker?.addEventListener("message", onMsg)
    return () => {
      window.removeEventListener("hashchange", openFromHash)
      navigator.serviceWorker?.removeEventListener("message", onMsg)
    }
  }, [openFromHash, router])
  // Süzgüchte peqet bir workspace tallanghan bolsa, yéngi xatire shu workspace'ke chüshidu
  const add = (status?: Status, deadline?: string) =>
    setTarget({ status, deadline, workspaceId: filters.workspaces.length === 1 ? filters.workspaces[0] : undefined })
  const onNotesPage = pathname.startsWith("/notes")
  const onAbout = pathname.startsWith("/about")
  const onSchedule = pathname.startsWith("/schedule")
  const onArchive = pathname.startsWith("/archive")

  const ctx: Shell = {
    filters, setFilters, sortBy, setSortBy, sortDir, setSortDir, view, setView, visible,
    edit, open, add, askDelete: setToDelete, loadDemo,
  }

  return (
    <ShellCtx.Provider value={ctx}>
      <SidebarProvider>
        <AppSidebar
          notes={notes}
          archivedCount={archived.length}
          onExport={doExport}
          onExportCsv={doExportCsv}
          onDemo={loadDemo}
          onImport={pickFile}
          onLogout={logout}
          onReminders={() => setRemOpen(true)}
          schedule={pathname.startsWith("/schedule") ? scheduleIo : undefined}
        />
        <SidebarInset className="app-bg min-w-0 bg-transparent">
          <div className="flex flex-1 flex-col gap-4 p-4 pb-32 md:p-6">
            <AppHeader
              title={onNotesPage ? t.notes : onArchive ? t.archive.title : onSchedule ? t.schedule.title : onAbout ? t.about.title : pathname.startsWith("/calendar") ? t.calendar.title : t.dashboard.greeting}
              subtitle={onNotesPage ? t.notesSubtitle : onArchive ? t.archive.subtitle : onSchedule ? t.schedule.subtitle : onAbout ? t.about.subtitle : pathname.startsWith("/calendar") ? t.calendar.subtitle : t.dashboard.subtitle}
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
            {/* Sehipe almashqanda peqet mezmun yumshaq almishidu; sidebar/header/bar ornida turidu */}
            <ViewTransition key={pathname} default={isDesktop ? "page-fade" : "none"}>
              <div className="flex flex-col gap-4">{children}</div>
            </ViewTransition>
          </div>
        </SidebarInset>
        <MobileBottomNav />

        <NoteDetailPanel
          note={detail}
          onClose={() => setDetail(null)}
          onDelete={(n) => {
            setDetail(null)
            setToDelete(n)
          }}
          onEdit={(n) => {
            setDetail(null)
            edit(n)
          }}
        />
        <NoteDialog target={target} onClose={() => setTarget(null)} />
        {remOpen && <ReminderSettings open={remOpen} onOpenChange={setRemOpen} />}
        <CommandSearch
          open={cmdOpen}
          setOpen={setCmdOpen}
          notes={notes}
          onOpenNote={open}
          onNew={() => add()}
          setView={(v) => {
            setView(v)
            router.push("/notes")
          }}
          onExport={doExport}
          onExportCsv={doExportCsv}
        />
        {importUi}
        {scheduleIo.ui}

        <DeleteFlow note={toDelete} onClose={() => setToDelete(null)} />
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
