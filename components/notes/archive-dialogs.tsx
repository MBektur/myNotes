"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { t } from "@/lib/i18n"
import { useNotes } from "@/lib/notes-store"
import type { Note } from "@/lib/types"

/**
 * Öchürüsh jeryani: aktiv xatire -> aldi bilen sorap arshivleydu; arshivdiki xatire -> "danger zone" (jümlini yézish) arqiliq mengguluk öchüridu.
 * `note` null bolsa héchqandaq dialog körünmeydu.
 */
export function DeleteFlow({ note, onClose }: { note: Note | null; onClose: () => void }) {
  // Yépilish animatsiyesi waqtida mezmun birdinla yoqap ketmisun
  const [kept, setKept] = React.useState<Note | null>(note)
  if (note && note !== kept) setKept(note)
  const shown = note ?? kept

  return (
    <>
      <ArchiveConfirm note={shown && !shown.archivedAt ? shown : null} open={!!note && !note.archivedAt} onClose={onClose} />
      <DangerDelete note={shown?.archivedAt ? shown : null} open={!!note?.archivedAt} onClose={onClose} />
    </>
  )
}

function ArchiveConfirm({ note, open, onClose }: { note: Note | null; open: boolean; onClose: () => void }) {
  const { archive, restore } = useNotes()
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.archive.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.archive.confirmDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>{t.archive.cancel}</Button>
          <Button
            onClick={() => {
              if (note) {
                const id = note.id
                archive(id)
                toast.success(t.archive.done, { action: { label: t.archive.undo, onClick: () => restore(id) } })
              }
              onClose()
            }}
          >
            {t.archive.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DangerDelete({ note, open, onClose }: { note: Note | null; open: boolean; onClose: () => void }) {
  const { remove } = useNotes()
  const [text, setText] = React.useState("")
  const phrase = t.archive.phrase
  const ok = text.trim().toLowerCase() === phrase.toLowerCase()

  function close() {
    setText("")
    onClose()
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent className="border-destructive/40 ring-2 ring-destructive/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> {t.archive.dangerTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>{t.archive.dangerDesc}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm">{t.archive.dangerType(phrase)}</p>
          <Input
            dir="ltr"
            value={text}
            autoFocus
            placeholder={phrase}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && ok && note) {
                remove(note.id)
                toast.success(t.archive.deleted)
                close()
              }
            }}
            className="text-start"
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={close}>{t.archive.cancel}</Button>
          <Button
            variant="destructive"
            disabled={!ok}
            onClick={() => {
              if (note) remove(note.id)
              toast.success(t.archive.deleted)
              close()
            }}
          >
            {t.archive.deletePermanent}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
