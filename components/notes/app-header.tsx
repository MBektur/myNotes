"use client"

import Image from "next/image"
import { Bell, Moon, Search } from "lucide-react"
import { useTheme } from "next-themes"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { t } from "@/lib/i18n"
import { ug } from "@/lib/ug"

export function AppHeader({
  query,
  setQuery,
  title,
  subtitle,
  overdue,
  onBell,
}: {
  query: string
  setQuery: (q: string) => void
  title: string
  subtitle?: string
  overdue: number
  onBell: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <header className="flex flex-wrap items-center gap-3">
      <SidebarTrigger className="clay size-10 shrink-0 rounded-2xl md:hidden" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-3xl font-regular sm:text-4xl">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      <div className="relative order-last w-full sm:order-none sm:w-56 lg:w-64">
        <Search className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(ug(e.target.value))}
          placeholder={t.search}
          className="clay h-11 rounded-full border-0 bg-card ps-10 pe-12 shadow-none"
        />
        <kbd className="pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      <button
        type="button"
        onClick={onBell}
        aria-label={t.dashboard.overdueCount}
        className="clay relative flex size-11 shrink-0 items-center justify-center rounded-2xl"
      >
        <Bell className="size-5 text-amber-600 dark:text-amber-300" />
        {overdue > 0 && (
          <span className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-pink-400 text-[11px] font-bold text-white shadow">
            {overdue}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        aria-label={t.theme.toggle}
        className="clay flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl"
      >
        <span className="dark:hidden">🌤️</span>
        <span className="hidden dark:inline"><Moon className="size-5" /></span>

      </button>
      <div className="clay hidden size-11 shrink-0 overflow-hidden rounded-2xl p-0.5 sm:block">
        <Image src="/img/3d-avatar.jpg" alt="" width={88} height={88} className="size-full rounded-[0.85rem] object-cover" />
      </div>
    </header>
  )
}
