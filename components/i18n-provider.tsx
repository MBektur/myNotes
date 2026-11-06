"use client"

import * as React from "react"
import {
  DEFAULT_LOCALE,
  DIR,
  LOCALES,
  LOCALE_NAMES,
  getLocale,
  readStoredLocale,
  setLocale,
  subscribeLocale,
  type Dir,
  type Locale,
} from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Hazirqi til. Til özgergende pütün ilova qaytidin qurulidu (t proxy yéngi tilni oquydu). */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = React.useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE)

  // Hydration'dan keyin saqlan'ghan tilni qollinidu (server HTML hemishe DEFAULT_LOCALE).
  React.useEffect(() => {
    const saved = readStoredLocale()
    if (saved) setLocale(saved, false)
  }, [])

  return <React.Fragment key={locale}>{children}</React.Fragment>
}

export function useLocale(): { locale: Locale; dir: Dir; setLocale: (l: Locale) => void } {
  const locale = React.useSyncExternalStore(subscribeLocale, getLocale, () => DEFAULT_LOCALE)
  return { locale, dir: DIR[locale], setLocale }
}

/** ئۇيغۇرچە · English · Türkçe */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale()
  return (
    <div role="group" aria-label="Language" className={cn("flex gap-1 rounded-2xl bg-muted/60 p-1", className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          dir={DIR[l]}
          aria-pressed={locale === l}
          onClick={() => setLocale(l)}
          className={cn(
            "flex-1 rounded-xl px-2 py-1.5 text-xs transition-colors",
            locale === l ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  )
}
