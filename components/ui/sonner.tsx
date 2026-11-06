"use client"

import { useTheme } from "next-themes"
import { useLocale } from "@/components/i18n-provider"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { dir } = useLocale()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      dir={dir}
      position={dir === "rtl" ? "bottom-left" : "bottom-right"}
      closeButton
      mobileOffset={{ bottom: "6.5rem" }}
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans text-sm",
          title: "font-sans",
          description: "font-sans",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
