import * as React from "react"

/** el öz ichide, berilgen yönilishte (dx / dy) yene scroll qilalamdu? (html / body hésabqa élinmaydu) */
function canScrollWithin(start: EventTarget | null, dx: number, dy: number) {
  const vertical = Math.abs(dy) >= Math.abs(dx)
  for (let el = start instanceof Element ? start : null; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const s = getComputedStyle(el)
    const overflow = vertical ? s.overflowY : s.overflowX
    if (overflow !== "auto" && overflow !== "scroll" && overflow !== "overlay") continue
    const [pos, size, view] = vertical ? [el.scrollTop, el.scrollHeight, el.clientHeight] : [Math.abs(el.scrollLeft), el.scrollWidth, el.clientWidth]
    if (size <= view + 1) continue
    const delta = vertical ? dy : dx
    const isRtlX = !vertical && s.direction === "rtl"
    const forward = isRtlX ? delta < 0 : delta > 0
    if (forward ? pos + view < size - 1 : pos > 0) return true
  }
  return false
}

/**
 * Modal échilghanda arqidiki sehipening scroll qilishini tosaydu, lékin html ning scrollbar'ini ornida qaldurudu.
 * (Base UI ning ichki scroll-lock'i html ni `overflow:hidden` qilidu; `scrollbar-gutter: stable` bolghachqa scrollbar
 * ornida boshluq qalidu — Safari da, RTL dimu scrollbar ong terepte bolghachqa, sidebar yénida boshluq bolup körünidu.)
 * Dialog.Root ni `modal="trap-focus"` bilen ishlitish kérek (u scroll-lock qoymaydu).
 */
export function usePageScrollBlock(open: boolean) {
  React.useEffect(() => {
    if (!open) return
    const x0 = window.scrollX
    const y0 = window.scrollY

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom
      if (!canScrollWithin(e.target, e.deltaX, e.deltaY)) e.preventDefault()
    }
    let tx = 0
    let ty = 0
    const onTouchStart = (e: TouchEvent) => {
      tx = e.touches[0].clientX
      ty = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const { clientX, clientY } = e.touches[0]
      const dx = tx - clientX
      const dy = ty - clientY
      tx = clientX
      ty = clientY
      if (e.cancelable && !canScrollWithin(e.target, dx, dy)) e.preventDefault()
    }
    // Axirqi tosush: scrollbar'ni sörep, klaviatura (Space / PageDown) bilen scroll qilishlarni qayturidu
    const onScroll = () => {
      if (window.scrollX !== x0 || window.scrollY !== y0) window.scrollTo(x0, y0)
    }

    document.addEventListener("wheel", onWheel, { passive: false })
    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("scroll", onScroll)
    return () => {
      document.removeEventListener("wheel", onWheel)
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("scroll", onScroll)
    }
  }, [open])
}
