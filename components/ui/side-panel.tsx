"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Panel footer tugmilirining ortaq uslubi: chong, bosushqa qolay */
export const panelBtn = "h-11 rounded-xl px-5 text-sm [&_svg:not([class*='size-'])]:size-4"

const KEY = "mynotes:panel-width"
const MIN_W = 360
const DEFAULT_W = 480
const maxW = () => Math.min(900, Math.round(window.innerWidth * 0.9))
const clamp = (v: number) => Math.min(maxW(), Math.max(MIN_W, v))

function readWidth() {
  try {
    const v = Number(localStorage.getItem(KEY))
    if (v >= MIN_W) return v
  } catch {}
  return DEFAULT_W
}
function saveWidth(v: number) {
  try { localStorage.setItem(KEY, String(Math.round(v))) } catch {}
}

/**
 * Chet tereptin échilidighan, kengliki sörep özgertkili bolidighan yan panel (modal).
 * Programma RTL bolghachqa, ong teriptiki gézish panelini yapmasliq üchün sol kéniridin échilidu.
 * Kengliki ikki sehipide (jeduel / xatire) ortaq bolup, brauzérda saqlinidu.
 */
export function SidePanel({
  open,
  onOpenChange,
  title,
  badges,
  description,
  headerClassName,
  footer,
  scroll = true,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  /** ماۋزۇنىڭ ئۈستىدىكى كىچىك بەلگىلەر (badge) */
  badges?: React.ReactNode
  /** ماۋزۇنىڭ ئاستىدىكى كىچىك ئىزاھات (mes. chisla) */
  description?: React.ReactNode
  headerClassName?: string
  footer?: React.ReactNode
  /** false: mezmun öz ichide scroll qilidu (mes. form + ayrim footer), panel sirttin scroll qilmaydu */
  scroll?: boolean
  children: React.ReactNode
}) {
  const [width, setWidth] = React.useState(readWidth)
  const widthRef = React.useRef(width)
  const dragging = React.useRef(false)

  const apply = (v: number) => {
    const c = clamp(v)
    widthRef.current = c
    setWidth(c)
  }
  const end = () => {
    if (!dragging.current) return
    dragging.current = false
    saveWidth(widthRef.current)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[3px]" />
        <Dialog.Popup
          dir="rtl"
          style={{ "--panel-w": `${width}px` } as React.CSSProperties}
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-[min(var(--panel-w),90vw)] flex-col bg-popover text-popover-foreground shadow-2xl outline-none max-sm:w-full",
            "border-e transition duration-200 ease-out data-ending-style:-translate-x-8 data-ending-style:opacity-0 data-starting-style:-translate-x-8 data-starting-style:opacity-0"
          )}
        >
          <header className={cn("relative shrink-0 space-y-2 border-b px-5 pt-5 pb-4 pe-14", headerClassName)}>
            {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
            <Dialog.Title className="font-heading text-2xl leading-tight break-words">{title}</Dialog.Title>
            {description && <div className="text-xs text-foreground/60">{description}</div>}
            <Dialog.Close
              render={<Button variant="ghost" size="icon" className="absolute end-3 top-3 rounded-full" aria-label={t.detail.close} />}
            >
              <X />
            </Dialog.Close>
          </header>

          <div className={cn("min-h-0 flex-1", scroll ? "overflow-y-auto" : "flex flex-col")}>{children}</div>

          {footer && <div className="flex shrink-0 justify-end gap-2.5 border-t bg-muted/60 px-5 py-4 max-sm:[&>button]:flex-1">{footer}</div>}

          {/* Kéngeytish tutqisi: panelning ichki (ong) chéti. Mobilda yoq. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={MIN_W}
            aria-valuenow={width}
            tabIndex={0}
            title={t.panel.resize}
            className="group absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none outline-none max-sm:hidden"
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.currentTarget.setPointerCapture(e.pointerId)
              dragging.current = true
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return
              if (!(e.buttons & 1)) return end()
              apply(e.clientX) // panel sol kéniridin bashlanghachqa, kenglik = chashqanning X orni
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
            onDoubleClick={() => { apply(DEFAULT_W); saveWidth(DEFAULT_W) }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
              e.preventDefault()
              apply(widthRef.current + (e.key === "ArrowRight" ? 24 : -24))
              saveWidth(widthRef.current)
            }}
          >
            <span className="mx-auto block h-full w-px bg-transparent transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary group-active:bg-primary" />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
