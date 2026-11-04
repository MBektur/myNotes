import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anon)

let client: SupabaseClient | null = null

/** Tarayıcı istemcisi (oturum localStorage'da). Yalnızca RLS ile korunan anon anahtar kullanılır. */
export function supabase(): SupabaseClient {
  if (!url || !anon) throw new Error("Supabase env vars missing")
  return (client ??= createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true },
  }))
}

let uidCache: string | null = null
export async function currentUserId(): Promise<string> {
  if (uidCache) return uidCache
  const { data } = await supabase().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error("Not signed in")
  return (uidCache = id)
}
export function clearUserCache() {
  uidCache = null
}
