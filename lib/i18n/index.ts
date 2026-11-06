import type { Messages } from "./ug"
import { ug } from "./ug"
import { en } from "./en"
import { tr } from "./tr"

export type { Messages }
export type Locale = "ug" | "en" | "tr"
export type Dir = "rtl" | "ltr"

/** Dil seçicidiki tertip: Uyghurche otturida */
export const LOCALES: readonly Locale[] = ["en", "ug", "tr"]
export const DEFAULT_LOCALE: Locale = "ug"
export const DIR: Record<Locale, Dir> = { ug: "rtl", en: "ltr", tr: "ltr" }
/** html lang özellikleri */
export const HTML_LANG: Record<Locale, string> = { ug: "ug", en: "en", tr: "tr" }
/** Dil tanlash ücün öz ismi (hemme tilda ohshash körünidu) */
export const LOCALE_NAMES: Record<Locale, string> = { ug: "ئۇيغۇرچە", en: "English", tr: "Türkçe" }
export const LOCALE_KEY = "mynotes:locale"

const dicts: Record<Locale, Messages> = { ug, en, tr }

const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v)

let current: Locale = DEFAULT_LOCALE
const listeners = new Set<() => void>()

export const getLocale = () => current
export const getDir = () => DIR[current]

export function subscribeLocale(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function readStoredLocale(): Locale | null {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    return isLocale(v) ? v : null
  } catch {
    return null
  }
}

/** Tilni almashturidu: saqlaydu, <html lang/dir> ni yéngilaydu we ulanghan komponentlarni xewer qilidu. */
export function setLocale(next: Locale, persist = true) {
  if (persist) {
    try {
      localStorage.setItem(LOCALE_KEY, next)
    } catch { }
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = HTML_LANG[next]
    document.documentElement.dir = DIR[next]
  }
  if (next === current) return
  current = next
  listeners.forEach((fn) => fn())
}

/**
 * Ékranda körünidighan hemme tékistler. `t.xxx` hemishe hazirqi tilni oquydu,
 * shunga store / toast qatarliq React'siz kodlardimu ishlitileleydu.
 * Til özgergende komponentlar I18nProvider arqiliq qaytidin qurulidu.
 */
export const t: Messages = new Proxy({} as Messages, {
  get: (_, key) => Reflect.get(dicts[current], key),
})
