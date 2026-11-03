import type { Metadata, Viewport } from "next"
import { Noto_Naskh_Arabic } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGate } from "@/components/auth/auth-gate"
import "./globals.css"

// Noto Naskh Arabic: Uygur yazısına uygun naskh biçimleri (Farsça tarzı Vazirmatn yerine)
const naskh = Noto_Naskh_Arabic({ variable: "--font-naskh", subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "myNotes",
  description: "شەخسىي خاتىرە ۋە ۋەزىپە تاختىسى",
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl"
      lang="ug"
      suppressHydrationWarning
      className={`${naskh.variable} h-full antialiased`}
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
