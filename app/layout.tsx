import type { Metadata, Viewport } from "next"
import { Lateef, Vazirmatn } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGate } from "@/components/auth/auth-gate"
import "./globals.css"

// Vazirmatn: gövde metni · Lateef: başlıklar (ikisi de Google Fonts, Arapça alt kümesi)
const vazirmatn = Vazirmatn({ variable: "--font-vazirmatn", subsets: ["arabic", "latin"] })
const lateef = Lateef({ variable: "--font-lateef", subsets: ["arabic", "latin"], weight: ["400", "700", "800"] })

export const metadata: Metadata = {
  title: "myNotes",
  description: "شەخسىي خاتىرە ۋە ۋەزىپە تاختىسى",
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 }

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
