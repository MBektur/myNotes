import type { Metadata, Viewport } from "next"
import { Vazirmatn, Lateef } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGate } from "@/components/auth/auth-gate"
import "./globals.css"

const vazirmatn = Vazirmatn({ variable: "--font-vazirmatn", subsets: ["arabic", "latin"] })
// Lateef: yalnızca h1–h6 başlıkları için
const lateef = Lateef({ variable: "--font-lateef", subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "myNotes",
  description: "شەخسىي خاتىرە ۋە ۋەزىپە تاختىسى",
  appleWebApp: { capable: true, title: "myNotes", statusBarStyle: "default" },
}

// Mobilda zoom (pinch / input fokusi) cheklengen
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" }

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl"
      lang="ug"
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${lateef.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthGate>{children}</AuthGate>
          </TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
