"use client"

import Image from "next/image"
import { Check, Download, LogOut, Moon, Sparkles, Sun, Upload } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { Filters } from "@/lib/filters"
import type { Page } from "@/lib/storage"
import type { Note } from "@/lib/types"

const itemCls = "h-11 gap-3 text-[15px] text-start"
const Emoji = ({ children }: { children: string }) => (
  <span className="w-6 shrink-0 text-center text-xl leading-none" aria-hidden>
    {children}
  </span>
)

export function AppSidebar({
  notes,
  filters,
  setFilters,
  page,
  setPage,
  onExport,
  onImport,
  onDemo,
  onLogout,
}: {
  notes: Note[]
  filters: Filters
  setFilters: (f: Filters) => void
  page: Page
  setPage: (p: Page) => void
  onExport: () => void
  onImport: () => void
  onDemo: () => void
  onLogout: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const { setOpenMobile } = useSidebar()
  const close = () => setOpenMobile(false)

  const categories = new Map<string, number>()
  const tags = new Map<string, number>()
  for (const n of notes) {
    if (n.category) categories.set(n.category, (categories.get(n.category) ?? 0) + 1)
    for (const tag of n.tags) tags.set(tag, (tags.get(tag) ?? 0) + 1)
  }
  const isAll = !filters.category && !filters.tags.length

  const goCalendar = () => {
    setPage("dashboard")
    close()
    setTimeout(() => document.getElementById("dash-calendar")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80)
  }

  return (
    <Sidebar side="right" variant="floating">
      <SidebarHeader className="p-4 pb-2">
        <div className="flex flex-col items-center text-center">
          <div className="clay size-32 overflow-hidden rounded-[2rem] p-1.5">
            <Image
              src="/img/3d-avatar.jpg"
              alt=""
              width={256}
              height={256}
              priority
              className="size-full rounded-[1.5rem] object-cover"
            />
          </div>
          <span className="mt-3 text-xl font-bold">{t.appName} 💜</span>
          <span className="mt-0.5 text-xs text-sidebar-foreground/70">{t.dashboard.profileRole}</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 py-2">
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              className={itemCls}
              isActive={page === "dashboard"}
              onClick={() => {
                setPage("dashboard")
                close()
              }}
            >
              <Emoji>🏠</Emoji> <span>{t.dashboard.nav}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={itemCls}
              isActive={page === "notes" && isAll}
              onClick={() => {
                setFilters({ ...filters, category: undefined, tags: [] })
                setPage("notes")
                close()
              }}
            >
              <Emoji>📝</Emoji> <span className="flex-1">{t.notes}</span>
              <span className="text-xs opacity-70">{notes.length}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className={itemCls} onClick={goCalendar}>
              <Emoji>📅</Emoji> <span>{t.dashboard.calendarNav}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton className={itemCls} isActive={!!filters.category} />}
              >
                <Emoji>📚</Emoji> <span className="flex-1">{t.categories}</span>
                <span className="text-xs opacity-70">{categories.size}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="start" className="min-w-44">
                {categories.size === 0 && (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">{t.noCategories}</p>
                )}
                {[...categories].sort().map(([c, count]) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => {
                      setFilters({ ...filters, category: filters.category === c ? undefined : c })
                      close()
                    }}
                  >
                    <Check className={cn("size-4", filters.category !== c && "opacity-0")} />
                    <span className="flex-1">{c}</span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton className={itemCls} isActive={filters.tags.length > 0} />}
              >
                <Emoji>🏷️</Emoji> <span className="flex-1">{t.hashtags}</span>
                <span className="text-xs opacity-70">{tags.size}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="start" className="min-w-44">
                {tags.size === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t.noTags}</p>}
                {[...tags].sort().map(([tag, count]) => {
                  const on = filters.tags.includes(tag)
                  return (
                    <DropdownMenuItem
                      key={tag}
                      onClick={() => {
                        setFilters({
                          ...filters,
                          tags: on ? filters.tags.filter((x) => x !== tag) : [...filters.tags, tag],
                        })
                        close()
                      }}
                    >
                      <Check className={cn("size-4", !on && "opacity-0")} />
                      <span className="flex-1" dir="auto">#{tag}</span>
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <div className="clay flex items-center gap-2 rounded-3xl p-3">
          <span className="text-4xl" aria-hidden>🪴</span>
          <p className="text-xs leading-relaxed text-foreground/70">{t.dashboard.motivation}</p>
        </div>
        <div className="flex items-center justify-between px-1">
          {[
            { label: t.io.export, icon: <Download />, onClick: onExport },
            { label: t.io.import, icon: <Upload />, onClick: onImport },
            { label: t.dashboard.loadDemoUi, icon: <Sparkles />, onClick: onDemo },
            {
              label: t.theme.toggle,
              icon: (
                <>
                  <Sun className="dark:hidden" />
                  <Moon className="hidden dark:block" />
                </>
              ),
              onClick: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
            },
            { label: t.logout, icon: <LogOut />, onClick: onLogout },
          ].map((a) => (
            <Button
              key={a.label}
              variant="ghost"
              size="icon"
              aria-label={a.label}
              title={a.label}
              className="rounded-xl hover:bg-white/60 dark:hover:bg-white/10"
              onClick={a.onClick}
            >
              {a.icon}
            </Button>
          ))}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
