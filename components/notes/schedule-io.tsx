"use client"

import * as React from "react"
import { toast } from "sonner"
import { t } from "@/lib/i18n"
import { exportScheduleCsv, parseScheduleCsv } from "@/lib/schedule-csv"
import { resetSchedule, saveSchedule, useSchedule } from "@/lib/schedule-store"

/** Jeduel CSV import/export/reset: yenggi yan panelda (sidebar) /schedule sehipiside ishlitilidu */
export function useScheduleIo() {
  const data = useSchedule()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const doExport = React.useCallback(() => {
    exportScheduleCsv(data)
    toast.success(t.schedule.exported)
  }, [data])

  const doReset = React.useCallback(() => {
    resetSchedule()
    toast.success(t.schedule.resetDone)
  }, [])

  const pickFile = React.useCallback(() => inputRef.current?.click(), [])

  const ui = (
    <input
      ref={inputRef}
      type="file"
      accept="text/csv,.csv"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        const parsed = parseScheduleCsv(await file.text())
        if (!parsed) return toast.error(t.io.invalid)
        saveSchedule({ people: parsed.people, lessons: parsed.lessons })
        toast.success(t.schedule.imported(parsed.people.length, parsed.lessons.length))
        if (parsed.skipped) toast.warning(t.schedule.skipped(parsed.skipped))
      }}
    />
  )
  return { doExport, doReset, pickFile, ui }
}
