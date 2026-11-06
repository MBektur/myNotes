"use client"

import * as React from "react"
import { Download, FileSpreadsheet, KanbanSquare, LayoutGrid, List, Plus } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { t } from "@/lib/i18n"
import type { Note, ViewMode } from "@/lib/types"
import { useWorkspaces } from "@/lib/workspaces-store"

export function CommandSearch({
  open,
  setOpen,
  notes,
  onOpenNote,
  onNew,
  setView,
  onExport,
  onExportCsv,
}: {
  open: boolean
  setOpen: (o: boolean) => void
  notes: Note[]
  onOpenNote: (n: Note) => void
  onNew: () => void
  setView: (v: ViewMode) => void
  onExport: () => void
  onExportCsv: () => void
}) {
  const workspaces = useWorkspaces()
  const wsName = React.useMemo(() => new Map(workspaces.map((w) => [w.id, w.name])), [workspaces])
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, setOpen])

  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-1/3 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>{t.search}</DialogTitle>
        </DialogHeader>
        <Command
          filter={(value, search, keywords) =>
            `${value} ${(keywords ?? []).join(" ")}`.toLowerCase().includes(search.toLowerCase().replace(/^#/, "")) ? 1 : 0
          }
        >
          <CommandInput placeholder={t.searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{t.noResults}</CommandEmpty>
            <CommandGroup heading={t.commands}>
              <CommandItem onSelect={run(onNew)}><Plus /> {t.newNote}</CommandItem>
              <CommandItem onSelect={run(() => setView("kanban"))}><KanbanSquare /> {t.view.kanban}</CommandItem>
              <CommandItem onSelect={run(() => setView("card"))}><LayoutGrid /> {t.view.card}</CommandItem>
              <CommandItem onSelect={run(() => setView("list"))}><List /> {t.view.list}</CommandItem>
              <CommandItem onSelect={run(onExport)}><Download /> {t.io.export} JSON</CommandItem>
              <CommandItem onSelect={run(onExportCsv)}><FileSpreadsheet /> {t.io.exportCsv}</CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t.results}>
              {notes.map((n) => (
                <CommandItem
                  key={n.id}
                  value={n.id}
                  keywords={[
                    n.title ?? "",
                    n.content ?? "",
                    wsName.get(n.workspaceId ?? "") ?? "",
                    n.category ?? "",
                    ...n.tags,
                    ...n.links.flatMap((l) => [l.url, l.label ?? ""]),
                    ...n.checklist.map((c) => c.text),
                  ]}
                  onSelect={run(() => onOpenNote(n))}
                >
                  <span className="truncate">{n.title || n.content?.slice(0, 60) || t.untitled}</span>
                  <span className="ms-auto text-xs text-muted-foreground">{t.statuses[n.status]}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
