"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Download, FileSpreadsheet, LogOut, Moon, Sparkles, Sun, Upload } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
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
import { t } from "@/lib/i18n"
import type { Note } from "@/lib/types"

const itemCls = "h-11 gap-3 text-[15px] text-start"
const Emoji = ({ children }: { children: string }) => (
  <span className="w-6 shrink-0 text-center text-xl leading-none" aria-hidden>
    {children}
  </span>
)

export function AppSidebar({
  notes,
  onExport,
  onExportCsv,
  onImport,
  onDemo,
  onLogout,
}: {
  notes: Note[]
  onExport: () => void
  onExportCsv: () => void
  onImport: () => void
  onDemo: () => void
  onLogout: () => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const { setOpenMobile } = useSidebar()
  const pathname = usePathname()
  const close = () => setOpenMobile(false)

  const nav = [
    { href: "/", emoji: "🏠", label: t.dashboard.nav, active: pathname === "/" },
    { href: "/notes", emoji: "📝", label: t.notes, active: pathname.startsWith("/notes"), badge: notes.length },
    { href: "/calendar", emoji: "📅", label: t.dashboard.calendarNav, active: pathname.startsWith("/calendar") },
  ]

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
          <span className="mt-3 text-xl font-regular">{t.appName} 💜</span>
          <span className="mt-0.5 text-xs text-sidebar-foreground/70">{t.dashboard.profileRole}</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 py-2">
        <SidebarMenu className="gap-1.5">
          {nav.map((n) => (
            <SidebarMenuItem key={n.href}>
              <SidebarMenuButton
                className={itemCls}
                isActive={n.active}
                render={<Link href={n.href} onClick={close} />}
              >
                <Emoji>{n.emoji}</Emoji>
                <span className="flex-1">{n.label}</span>
                {n.badge !== undefined && <span className="text-xs opacity-70">{n.badge}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="gap-3 p-3">
        <div className="clay flex items-center gap-2 rounded-3xl p-3">
          <span className="text-4xl" aria-hidden>🪴</span>
          <p className="text-xs leading-relaxed text-foreground/70">{t.dashboard.motivation}</p>
        </div>
        <div className="flex items-center justify-between px-1">
          {[
            { label: `${t.io.export} JSON`, icon: <Download />, onClick: onExport },
            { label: t.io.exportCsv, icon: <FileSpreadsheet />, onClick: onExportCsv },
            { label: `${t.io.import} (${t.io.importHint})`, icon: <Upload />, onClick: onImport },
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
