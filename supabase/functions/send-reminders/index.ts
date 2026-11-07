// Supabase Edge Function (Deno). Ikki xil chaqirilidu:
//  1) pg_cron: `x-cron-secret` bashliqi bilen, her minutta -> waqti kelgen hatirlatmilarni yollaydu
//     (son kün hatirlatmiliri: due.ts; nota xas alarm'lar: occurrence.ts).
//  2) Kirgen kullanghuchi: `Authorization: Bearer <user jwt>` + body {"test": true} -> shu kullanghuchining qurilmilirigha sinaq bildirishi.
// Deploy: supabase functions deploy send-reminders --no-verify-jwt   (JWT'ni özimiz tekshürimiz)
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET
import { createClient } from "npm:@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"
import { computeDue, dropLogged, mostUrgent, type ReminderNote, type ReminderSettings } from "./due.ts"
import { buildMessage, buildNoteReminders, testMessage, type Locale } from "./messages.ts"
import { computeNoteDue } from "./occurrence.ts"

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

type Row = Record<string, string | number>
const keyOf = (r: Row, keys: string[]) => keys.map((k) => String(r[k])).join("|")

/** "Sahiplinish": log'qa yazalmighanlar (bashqa bir chaqirish aldin alghan) tashlinidu -> qosh bildirish bolmaydu. */
async function claim<T extends Row>(table: string, conflict: string, rows: T[]): Promise<T[]> {
  const keys = conflict.split(",")
  const { data, error } = await db.from(table).upsert(rows as Row[], { onConflict: conflict, ignoreDuplicates: true }).select(conflict)
  if (error) throw error
  const got = new Set(((data ?? []) as unknown as Row[]).map((r) => keyOf(r, keys)))
  return rows.filter((r) => got.has(keyOf(r, keys)))
}

/** Hechqaysi qurulmigha barmidi: log'ni qaytip alimiz, kéyinki chaqirishta yene urunup köridu */
async function unclaim(table: string, rows: Row[]) {
  for (const r of rows) await db.from(table).delete().match(r)
}

type NoteRow = { id: string; title: string | null; deadline: string | null; reminders: unknown }

/** Son kün hatirlatmiliri (hésab ayari: N kün burun). Yollanghan not sanini qaytiridu. */
async function sendDeadlineReminders(userId: string, settings: ReminderSettings, notes: NoteRow[], subs: Sub[], now: Date) {
  const withDeadline = notes.filter((n): n is NoteRow & { deadline: string } => !!n.deadline)
  let due = computeDue(withDeadline, settings, now)
  if (!due.length) return 0

  const { data: logs, error } = await db
    .from("reminder_log")
    .select("note_id,deadline,offset_days")
    .eq("user_id", userId)
    .in("note_id", [...new Set(due.map((d) => d.noteId))])
  if (error) throw error
  due = dropLogged(due, new Set((logs ?? []).map((l) => `${l.note_id}|${l.deadline}|${l.offset_days}`)))
  if (!due.length) return 0

  const rows = due.map((d) => ({ user_id: userId, note_id: d.noteId, deadline: d.deadline, offset_days: d.offset }))
  const claimed = await claim("reminder_log", "user_id,note_id,deadline,offset_days", rows)
  if (!claimed.length) return 0

  const titles = new Map(notes.map((n) => [n.id, n.title]))
  const mine = claimed.map((c) => ({ noteId: c.note_id, deadline: c.deadline, offset: c.offset_days }))
  const items = [...mostUrgent(mine)].map(([id, offset]) => ({ id, title: titles.get(id) ?? null, offset }))
  if (await pushTo(subs, (locale) => buildMessage(items, locale))) return items.length
  await unclaim("reminder_log", claimed)
  return 0
}

/** Nota xas hatirlatmilar (alarm: waqit + tekrar). Yollanghan not sanini qaytiridu. */
async function sendNoteReminders(userId: string, tz: string, notes: NoteRow[], subs: Sub[], now: Date) {
  const due = computeNoteDue(notes, tz, now)
  if (!due.length) return 0

  const rows = due.map((d) => ({ user_id: userId, note_id: d.noteId, reminder_id: d.reminderId, fire_at: d.fireAt }))
  const claimed = await claim("note_reminder_log", "user_id,note_id,reminder_id,fire_at", rows)
  if (!claimed.length) return 0

  const byId = new Map(notes.map((n) => [n.id, n]))
  const items = [...new Set(claimed.map((c) => c.note_id))].map((id) => ({
    id,
    title: byId.get(id)?.title ?? null,
    deadline: byId.get(id)?.deadline ?? null,
  }))
  // Her bir bildirish ayrim yollinidu (sani til'gha baghliq emes); birsila ötse "yollandi" dep hésablaymiz
  let ok = false
  const count = buildNoteReminders(items, "ug").length
  for (let i = 0; i < count; i++) {
    if (await pushTo(subs, (l) => buildNoteReminders(items, l)[i])) ok = true
  }
  if (ok) return items.length
  await unclaim("note_reminder_log", claimed)
  return 0
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
      const { data, error: ne } = await db
        .from("notes")
        .select("id,title,deadline,reminders")
        .eq("user_id", row.user_id)
        .is("archived_at", null)
        .neq("status", "done")
      if (ne) throw ne
      const notes = ((data ?? []) as NoteRow[]).filter((n) => n.deadline || (Array.isArray(n.reminders) && n.reminders.length))
      if (!notes.length) continue

      // Her minutta chaqirilidu: héchnerse waqti kelmigen bolsa qurulmilarni oqumaymiz
      const anyDue =
        computeDue(notes.filter((n) => n.deadline) as ReminderNote[], settings, now).length > 0 || computeNoteDue(notes, row.tz, now).length > 0
      if (!anyDue) continue

      const subs = await subsOf(row.user_id)
      if (!subs.length) continue // cihaz yoq: log yazmaymiz, kéyin abone bolsa yollanidu

      const n = (await sendDeadlineReminders(row.user_id, settings, notes, subs, now)) + (await sendNoteReminders(row.user_id, row.tz, notes, subs, now))
      if (n) {
        sentUsers++
        sentNotes += n
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
