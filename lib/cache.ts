// Achilishni tézleshtürüsh üchün: eng axirqi bulut melumatini brauzérda (kullanghuchi id'si bilen) keshlep qoyimiz.
// Aldi bilen keshtin körsitilidu, andin Supabase'tin yéngilinidu. Chiqishta barliq kesh öchürülidu.
const PREFIX = "mynotes:cache:"

export function readCache<T>(name: string, uid: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${name}:${uid}`)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache(name: string, uid: string, data: unknown) {
  try {
    localStorage.setItem(`${PREFIX}${name}:${uid}`, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function clearCaches() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
  } catch {}
}
