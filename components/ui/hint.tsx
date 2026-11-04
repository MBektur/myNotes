"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Ozel tooltip: sap CSS (hover + klaviatura fokusi), RTL/LTR'ge bagliq emes, kutupxanisiz.
 * Mobilda (hover yoq) körünmeydu; tugmida aria-label bolushi kérek.
 */
export function Hint({
  label,
  side = "bottom",
  align = "center",
  className,
  children,
}: {
  label: string
  side?: "top" | "bottom"
  /** start/end: chetke yéqin tugmilarda tooltip ekrandin chiqip ketmesliki üchün */
  align?: "center" | "start" | "end"
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn("group/hint relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 w-max max-w-56 rounded-lg bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background opacity-0 shadow-lg",
          "transition-opacity duration-150 group-hover/hint:opacity-100 group-hover/hint:delay-300 group-has-[:focus-visible]/hint:opacity-100",
          align === "center" && "start-1/2 -translate-x-1/2 rtl:translate-x-1/2",
          align === "start" && "start-0",
          align === "end" && "end-0",
          side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
        )}
      >
        {label}
      </span>
    </span>
  )
}
