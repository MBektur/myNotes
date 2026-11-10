"use client"

import * as React from "react"
import { usePageScrollBlock } from "@/hooks/use-page-scroll-block"

const isLocked = (html: HTMLElement) =>
  html.hasAttribute("data-base-ui-scroll-locked") || /hidden|clip/.test(html.style.overflowY)

/**
 * Base UI (Dialog / Select / Menu ...) échilghanda sehipini html ge `overflow:hidden` yézip qulpilaydu. `scrollbar-gutter: stable`
 * bolghachqa scrollbar ornida boshluq qalidu (Safari da RTL dimu scrollbar ong terepte, shuning bilen sidebar yénida boshluq körünidu).
 * globals.css dikí `html { overflow-y: scroll !important }` bu qulpni küchsizlendüridu (scrollbar ornida qalidu);
 * bu komponént bolsa qulpning yézilghanliqini (inline style) közitip, sehipening scroll qilishini özi tosaydu.
 */
export function PageScrollGuard() {
  const [locked, setLocked] = React.useState(false)

  React.useEffect(() => {
    const html = document.documentElement
    const sync = () => setLocked(isLocked(html))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(html, { attributes: true, attributeFilter: ["style", "data-base-ui-scroll-locked"] })
    return () => mo.disconnect()
  }, [])

  usePageScrollBlock(locked)
  return null
}
