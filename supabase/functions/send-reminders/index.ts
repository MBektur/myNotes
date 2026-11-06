// Supabase Edge Function (Deno). Ikki xil chaqirilidu:
//  1) pg_cron: `x-cron-secret` bashliqi bilen, her 10 minutta -> waqti kelgen hatirlatmilarni yollaydu.
//  2) Kirgen kullanghuchi: `Authorization: Bearer <user jwt>` + body {"test": true} -> shu kullanghuchining qurilmilirigha sinaq bildirishi.
// Deploy: supabase functions deploy send-reminders --no-verify-jwt   (JWT'ni özimiz tekshürimiz)
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET
import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import { computeDue, dropLogged, mostUrgent, type ReminderSettings } from "./due.ts"
import { buildMessage, testMessage, type Locale } from "./messages.ts"

const env = (k: string) => Deno.env.get(k) ?? ""
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } })

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

type Sub = { endpoint: string; p256dh: string; auth: string; locale: Locale }
type Msg = { title: string; body: string; url: string; tag: string }

/** Bir kullanghuchining hemme qurulmisigha yollaydu; ölgen (404/410) abonelikni öchüridu. Kamida birsi ötse true. */
async function pushTo(subs: Sub[], msgFor: (locale: Locale) => Msg): Promise<boolean> {
  let ok = false
  for (const s of subs) {
    const m = msgFor(s.locale)
    const payload = JSON.stringify({ ...m, lang: s.locale, dir: s.locale === "ug" ? "rtl" : "ltr" })
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: 60 * 60 * 24,
        urgency: "normal",
      })
      ok = true
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint)
      else console.error("push failed", code, (e as Error).message)
    }
  }
  return ok
}

async function subsOf(userId: string): Promise<Sub[]> {
  const { data, error } = await db.from("push_subscriptions").select("endpoint,p256dh,auth,locale").eq("user_id", userId)
  if (error) throw error
  return (data ?? []) as Sub[]
}

async function runTest(jwt: string) {
  const { data, error } = await db.auth.getUser(jwt)
  if (error || !data.user) return json({ error: "unauthorized" }, 401)
  const subs = await subsOf(data.user.id)
  if (!subs.length) return json({ sent: 0, reason: "no-subscription" })
  const ok = await pushTo(subs, testMessage)
  return json({ sent: ok ? 1 : 0 })
}

async function runCron() {
  const now = new Date()
  const { data: all, error } = await db.from("reminder_settings").select("user_id,offsets,send_time,tz").eq("enabled", true)
  if (error) throw error
  let sentUsers = 0
  let sentNotes = 0
  for (const row of all ?? []) {
    try {
      const settings: ReminderSettings = { offsets: row.offsets ?? [], sendTime: row.send_time, tz: row.tz }
      const { data: notes, error: ne } = await db
        .from("notes")
        .select("id,title,deadline")
        .eq("user_id", row.user_id)
        .is("archived_at", null)
        .neq("status", "done")
        .not("deadline", "is", null)
      if (ne) throw ne
      let due = computeDue(notes ?? [], settings, now)
      if (!due.length) continue

      const { data: logs, error: le } = await db
        .from("reminder_log")
        .select("note_id,deadline,offset_days")
        .eq("user_id", row.user_id)
        .in("note_id", [...new Set(due.map((d) => d.noteId))])
      if (le) throw le
      due = dropLogged(due, new Set((logs ?? []).map((l) => `${l.note_id}|${l.deadline}|${l.offset_days}`)))
      if (!due.length) continue

      const subs = await subsOf(row.user_id)
      if (!subs.length) continue // cihaz yoq: log yazmaymiz, kéyin abone bolsa yollanidu

      // "Sahiplinish": log'qa yazalmighanlar (bashqa bir chaqirish aldin yollighan) tashlinidu -> qosh bildirish bolmaydu
      const { data: claimed, error: ce } = await db
        .from("reminder_log")
        .upsert(
          due.map((d) => ({ user_id: row.user_id, note_id: d.noteId, deadline: d.deadline, offset_days: d.offset })),
          { onConflict: "user_id,note_id,deadline,offset_days", ignoreDuplicates: true },
        )
        .select("note_id,deadline,offset_days")
      if (ce) throw ce
      if (!claimed?.length) continue
      const mine = due.filter((d) => claimed.some((c) => c.note_id === d.noteId && c.deadline === d.deadline && c.offset_days === d.offset))

      const titles = new Map((notes ?? []).map((n) => [n.id, n.title as string | null]))
      const items = [...mostUrgent(mine)].map(([id, offset]) => ({ id, title: titles.get(id) ?? null, offset }))
      const ok = await pushTo(subs, (locale) => buildMessage(items, locale))
      if (ok) {
        sentUsers++
        sentNotes += items.length
      } else {
        // Hechqaysi qurulmigha barmidi: log'ni qaytip alimiz, kéyinki chaqirishta yene urunup köridu
        for (const d of mine) {
          await db.from("reminder_log").delete().match({ user_id: row.user_id, note_id: d.noteId, deadline: d.deadline, offset_days: d.offset })
        }
      }
    } catch (e) {
      console.error("user failed", row.user_id, (e as Error).message) // bir kullanghuchi bashqilarni toxtatmisun
    }
  }
  return json({ users: sentUsers, notes: sentNotes })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "method" }, 405)
  if (!env("VAPID_PUBLIC_KEY") || !env("VAPID_PRIVATE_KEY")) return json({ error: "vapid-not-configured" }, 500)
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:admin@example.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"))

  try {
    const cron = req.headers.get("x-cron-secret")
    if (cron !== null) {
      const secret = env("CRON_SECRET")
      if (!secret || !safeEqual(cron, secret)) return json({ error: "unauthorized" }, 401)
      return await runCron()
    }
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    const body = await req.json().catch(() => ({}))
    if (bearer && body?.test === true) return await runTest(bearer)
    return json({ error: "unauthorized" }, 401)
  } catch (e) {
    console.error(e)
    return json({ error: "internal" }, 500)
  }
})
