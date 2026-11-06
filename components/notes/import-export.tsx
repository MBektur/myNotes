"use client"

import * as React from "react"
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
import { exportCsv } from "@/lib/csv"
import { exportJson, parseImport, type ImportData } from "@/lib/export"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import { ensureWorkspacesByName, mergeWorkspaces, useWorkspaces } from "@/lib/workspaces-store"

export function useImportExport() {
  const { notes, importMerge, importReplace } = useNotes()
  const workspaces = useWorkspaces()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState<ImportData | null>(null)

  const doExport = React.useCallback(() => {
    exportJson(notes, workspaces)
    toast.success(t.io.exported)
  }, [notes, workspaces])

  const doExportCsv = React.useCallback(() => {
    exportCsv(notes, workspaces)
    toast.success(t.io.exportedCsv)
  }, [notes, workspaces])

  /** Workspace'lerni store'gha qoshup, xatirilerning workspaceId'sini toghrilaydu (nam -> id; tonush bolmighan id boshitilidu). */
  const prepare = React.useCallback((data: ImportData) => {
    mergeWorkspaces(data.workspaces)
    const byName = data.noteWorkspace?.size ? ensureWorkspacesByName([...data.noteWorkspace.values()]) : null
    const known = new Set([...workspaces.map((w) => w.id), ...data.workspaces.map((w) => w.id)])
    return data.notes.map((n) => {
      const csvName = data.noteWorkspace?.get(n.id)
      const workspaceId = csvName ? byName?.get(csvName) : n.workspaceId && known.has(n.workspaceId) ? n.workspaceId : undefined
      return { ...n, workspaceId }
    })
  }, [workspaces])

  const pickFile = React.useCallback(() => inputRef.current?.click(), [])

  const ui = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json,text/csv,.csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (!file) return
          const parsed = await parseImport(file)
          if (!parsed) toast.error(t.io.invalid)
          else setPending(parsed)
        }}
      />
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.io.importTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.io.importDesc(pending?.notes.length ?? 0)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>{t.form.cancel}</Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pending) {
                  importReplace(prepare(pending))
                  toast.success(t.io.imported(pending.notes.length))
                }
                setPending(null)
              }}
            >
              {t.io.replace}
            </Button>
            <Button
              onClick={() => {
                if (pending) {
                  importMerge(prepare(pending))
                  toast.success(t.io.imported(pending.notes.length))
                }
                setPending(null)
              }}
            >
              {t.io.merge}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return { doExport, doExportCsv, pickFile, ui }
}
