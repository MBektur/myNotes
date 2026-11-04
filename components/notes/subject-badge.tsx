"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Ders ati: hue (0–360) boyiche renglik badge */
export function SubjectBadge({ subject, hue, className }: { subject: string; hue: number | undefined; className?: string }) {
  return (
    <span
      dir="auto"
      className={cn("subject-badge inline-block max-w-full truncate rounded-full px-2 py-px align-middle text-[10px] font-medium leading-snug", className)}
      style={{ "--h": hue ?? 0 } as React.CSSProperties}
    >
      {subject}
    </span>
  )
}
