import type { Metadata, Viewport } from "next"
import { Vazirmatn, Lateef } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGate } from "@/components/auth/auth-gate"
import { I18nProvider } from "@/components/i18n-provider"
import { PageScrollGuard } from "@/components/page-scroll-guard"
import "./globals.css"

const vazirmatn = Vazirmatn({ variable: "--font-vazirmatn", subsets: ["arabic", "latin"] })
// Lateef: yalnızca h1–h6 başlıkları için
const lateef = Lateef({ variable: "--font-lateef", subsets: ["arabic"], weight: ["500", "700"], preload: false })

export const metadata: Metadata = {
  title: "myNotes",
  description: "Personal notes and task board",
  appleWebApp: { capable: true, title: "myNotes", statusBarStyle: "default" },
}

// Mobilda zoom (pinch / input fokusi) cheklengen
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" }

// Sehipe chizilmastin burun saqlan'ghan tilni <html lang/dir> gha qoyidu (RTL ⇄ LTR yalt qilmasliqi üchün).
const localeScript = `try{var l=localStorage.getItem("mynotes:locale");if(l==="en"||l==="tr"||l==="ug"){var d=document.documentElement;d.lang=l;d.dir=l==="ug"?"rtl":"ltr"}}catch(e){}`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl"
      lang="ug"
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${lateef.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <TooltipProvider>
              <AuthGate>{children}</AuthGate>
            </TooltipProvider>
            <Toaster />
            <PageScrollGuard />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
