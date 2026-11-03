import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthGate } from "@/components/auth/auth-gate"
import "./globals.css"

// Google Fonts'taki Vazirmatn (OFL) — peqet U+0649 ("ى") herpi U+06CC glifigha
// baghlanghan; shundaq Uyghurche "ى" toghra sizilidu. (Qara: app/fonts/README.md)
const vazirmatn = localFont({
  src: "./fonts/VazirmatnUG.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
})

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
      className={`${vazirmatn.variable} h-full antialiased`}
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
