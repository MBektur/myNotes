"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/i18n-provider"
import { usePageScrollBlock } from "@/hooks/use-page-scroll-block"
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
  } catch { }
  return DEFAULT_W
}
function saveWidth(v: number) {
  try { localStorage.setItem(KEY, String(Math.round(v))) } catch { }
}

/**
 * Chet tereptin échilidighan, kengliki sörep özgertkili bolidighan yan panel (modal).
 * RTL (Uyghurche) da sol kéniridin, LTR (English / Türkçe) da ong kéniridin échilidu (sidebar bilen toqunushmasliq üchün).
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
  const { dir } = useLocale()
  usePageScrollBlock(open)
  const rtl = dir === "rtl"
  const side = rtl ? -1 : 1 // panel échilghan terep: RTL = sol (-1), LTR = ong (+1)
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

  // ---- Mobilda barmaq bilen panelning kéniri terepke sörep yépish (swipe) ----
  const popupRef = React.useRef<HTMLDivElement>(null)
  const swipe = React.useRef<{ x0: number; y0: number; t0: number; axis: "x" | "y" | null; dx: number } | null>(null)

  const swipeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" || !window.matchMedia("(max-width: 639px)").matches) return
    if ((e.target as Element).closest("[data-no-swipe], input, textarea, select")) return
    swipe.current = { x0: e.clientX, y0: e.clientY, t0: e.timeStamp, axis: null, dx: 0 }
  }
  const swipeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = swipe.current
    const el = popupRef.current
    if (!g || !el) return
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    if (!g.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y"
      if (g.axis === "x") e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (g.axis !== "x") return
    g.dx = side < 0 ? Math.min(0, dx) : Math.max(0, dx) // peqet panelning kéniri terepke
    el.style.transition = "none"
    el.style.transform = `translateX(${g.dx}px)`
  }
  const swipeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = swipe.current
    const el = popupRef.current
    swipe.current = null
    if (!g || !el || g.axis !== "x") return
    const w = el.offsetWidth
    const velocity = (g.dx * side) / Math.max(1, e.timeStamp - g.t0) // px/ms, musbet = yépilish terepke
    el.style.transition = "transform 180ms cubic-bezier(0.33, 1, 0.68, 1)"
    if (g.dx * side > w * 0.3 || velocity > 0.5) {
      el.style.transform = `translateX(${side * w}px)`
      window.setTimeout(() => onOpenChange(false), 150)
    } else {
      el.style.transform = "translateX(0)"
      window.setTimeout(() => {
        el.style.transition = ""
        el.style.transform = ""
      }, 190)
    }
  }

  return (
    // modal="trap-focus": Base UI ning scroll-lock'i yoq (u scrollbar ornida boshluq qaldurudu), scroll'ni usePageScrollBlock tosaydu
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal="trap-focus">
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-250 ease-[cubic-bezier(0.33,1,0.68,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[3px]" />
        <Dialog.Popup
          ref={popupRef}
          onPointerDown={swipeStart}
          onPointerMove={swipeMove}
          onPointerUp={swipeEnd}
          onPointerCancel={swipeEnd}
          dir={dir}
          style={{ "--panel-w": `${width}px` } as React.CSSProperties}
          className={cn(
            rtl ? "left-0" : "right-0",
            "fixed inset-y-0 z-50 flex h-full w-[min(var(--panel-w),90vw)] touch-pan-y flex-col bg-popover text-popover-foreground shadow-2xl outline-none max-sm:w-full",
            "transition duration-250 ease-[cubic-bezier(0.33,1,0.68,1)]",
            rtl
              ? "border-e data-ending-style:-translate-x-full data-starting-style:-translate-x-full"
              : "border-s data-ending-style:translate-x-full data-starting-style:translate-x-full"
          )}
        >
          <header className={cn("relative shrink-0 space-y-2 border-b px-5 pt-5 pb-4 pe-14", headerClassName)}>
            {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
            <Dialog.Title className="font-heading text-2xl leading-tight break-words">{title}</Dialog.Title>
            {description && <div className="text-[13px] text-foreground/65">{description}</div>}
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
            className={cn(
              "group absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none outline-none max-sm:hidden",
              rtl ? "right-0" : "left-0"
            )}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.currentTarget.setPointerCapture(e.pointerId)
              dragging.current = true
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return
              if (!(e.buttons & 1)) return end()
              apply(rtl ? e.clientX : window.innerWidth - e.clientX) // kenglik = panelning sirtqi kénidin chashqanghiche
            }}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
            onDoubleClick={() => { apply(DEFAULT_W); saveWidth(DEFAULT_W) }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
              e.preventDefault()
              apply(widthRef.current + (e.key === (rtl ? "ArrowRight" : "ArrowLeft") ? 24 : -24))
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
