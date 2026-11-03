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
import { exportJson, parseImport } from "@/lib/export"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import type { Note } from "@/lib/types"

export function useImportExport() {
  const { notes, importMerge, importReplace } = useNotes()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState<Note[] | null>(null)

  const doExport = React.useCallback(() => {
    exportJson(notes)
    toast.success(t.io.exported)
  }, [notes])

  const pickFile = React.useCallback(() => inputRef.current?.click(), [])

  const ui = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
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
            <AlertDialogDescription>{t.io.importDesc(pending?.length ?? 0)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>{t.form.cancel}</Button>
            <Button
              variant="outline"
              onClick={() => {
                if (pending) {
                  importReplace(pending)
                  toast.success(t.io.imported(pending.length))
                }
                setPending(null)
              }}
            >
              {t.io.replace}
            </Button>
            <Button
              onClick={() => {
                if (pending) {
                  importMerge(pending)
                  toast.success(t.io.imported(pending.length))
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

  return { doExport, pickFile, ui }
}
