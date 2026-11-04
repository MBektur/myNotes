"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"
import { t } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Mobilde (<md) astida qadalghan gézish: Panel · Xatire · [+] · Kalendar · Heqqide */
export function MobileBottomNav({ onNew }: { onNew: () => void }) {
  const pathname = usePathname()

  const items = [
    { href: "/", emoji: "🏠", label: t.dashboard.nav, active: pathname === "/" },
    { href: "/notes", emoji: "📝", label: t.notes, active: pathname.startsWith("/notes") },
    { href: "/calendar", emoji: "📅", label: t.dashboard.calendarNav, active: pathname.startsWith("/calendar") },
    { href: "/about", emoji: "💜", label: t.about.nav, active: pathname.startsWith("/about") },
  ]

  const renderItem = (n: (typeof items)[number]) => (
    <Link
      key={n.href}
      href={n.href}
      aria-current={n.active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] transition-colors",
        n.active ? "bg-primary/15 font-medium text-foreground" : "text-foreground/60"
      )}
    >
      <span className="text-xl leading-none" aria-hidden>{n.emoji}</span>
      <span className="max-w-full truncate">{n.label}</span>
    </Link>
  )

  return (
    <nav
      aria-label="Main"
      className="clay fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 rounded-b-none rounded-t-3xl px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {renderItem(items[0])}
      {renderItem(items[1])}
      <button
        type="button"
        onClick={onNew}
        aria-label={t.newNote}
        title={t.newNote}
        className="-mt-6 flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background"
      >
        <Plus className="size-7" />
      </button>
      {renderItem(items[2])}
      {renderItem(items[3])}
    </nav>
  )
}
