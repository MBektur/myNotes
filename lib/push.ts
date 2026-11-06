import { currentUserId, supabase } from "./supabase/client"
import { getLocale } from "./i18n"

/** Hatirlatma ayarliri (genel). offsets = son kündin necche kün burun (0 = son kün). */
export type ReminderPrefs = { enabled: boolean; offsets: number[]; sendTime: string }
export const OFFSET_CHOICES = [0, 1, 2, 3, 7] as const
export const DEFAULT_PREFS: ReminderPrefs = { enabled: false, offsets: [0, 1], sendTime: "09:00" }

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const SW_URL = "/sw.js"

export const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

/** iPhone/iPad'da bildirish peqet "Ana Ékrangha Qoshulghan" ilovida ishleydu. */
export function needsInstallOnIos(): boolean {
  if (typeof window === "undefined") return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return ios && !standalone
}

export const permissionState = (): NotificationPermission | "unsupported" => (pushSupported() ? Notification.permission : "unsupported")
export const hasVapidKey = () => Boolean(VAPID_PUBLIC)

async function registration() {
  await navigator.serviceWorker.register(SW_URL)
  return navigator.serviceWorker.ready
}

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(s)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false
  const reg = await navigator.serviceWorker.getRegistration(SW_URL)
  return Boolean(await reg?.pushManager.getSubscription())
}

export type EnableResult = "ok" | "denied" | "unsupported" | "no-key" | "error"

/** Ruxset sorap, bu qurulmini abone qilip, Supabase'ge yazidu. Kullanghuchining chékishidin chaqirilishi kérek (iOS). */
export async function enablePush(): Promise<EnableResult> {
  if (!pushSupported()) return "unsupported"
  if (!VAPID_PUBLIC) return "no-key"
  try {
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
    if (perm !== "granted") return "denied"
    const reg = await registration()
    // Kona abonelik bashqa hésabqa tewe bolushi mumkin (endpoint ohshash): aldi bilen tazilap, yéngi endpoint alimiz
    const old = await reg.pushManager.getSubscription()
    if (old) {
      await supabase().from("push_subscriptions").delete().eq("endpoint", old.endpoint)
      await old.unsubscribe()
    }
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) })
    const json = sub.toJSON()
    const { error } = await supabase().from("push_subscriptions").upsert(
      {
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        locale: getLocale(),
        user_agent: navigator.userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" }
    )
    if (error) {
      await sub.unsubscribe()
      return "error"
    }
    return "ok"
  } catch {
    return "error"
  }
}

/** Bu qurulmining aboneligini ikki terepte (brauzer + Supabase) öchüridu. Chiqishta (logout) we öchürüshte ishlitilidu. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL)
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint)
    await sub.unsubscribe()
  } catch { }
}

/** Kirgendin kéyin / til özgergende: abonelikning tili we saat dilimini yéngilap turidu. */
export async function refreshSubscription(): Promise<void> {
  try {
    if (!(await isSubscribed())) return
    const reg = await navigator.serviceWorker.getRegistration(SW_URL)
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await supabase().from("push_subscriptions").update({ locale: getLocale() }).eq("endpoint", sub.endpoint)
    await supabase().from("reminder_settings").update({ tz: timeZone() }).eq("user_id", await currentUserId())
  } catch { }
}

/** Hésabta qalghan abone qurulma sani (hemmisi ochurulgende `enabled` ni ochurush üchün). */
export async function countDevices(): Promise<number> {
  const { count, error } = await supabase().from("push_subscriptions").select("endpoint", { count: "exact", head: true })
  if (error) throw error
  return count ?? 0
}

export async function loadPrefs(): Promise<ReminderPrefs> {
  const { data, error } = await supabase().from("reminder_settings").select("enabled,offsets,send_time").maybeSingle()
  if (error) throw error
  if (!data) return DEFAULT_PREFS
  return { enabled: data.enabled, offsets: data.offsets ?? [], sendTime: data.send_time }
}

export async function savePrefs(p: ReminderPrefs): Promise<void> {
  const { error } = await supabase()
    .from("reminder_settings")
    .upsert({ user_id: await currentUserId(), enabled: p.enabled, offsets: p.offsets, send_time: p.sendTime, tz: timeZone() })
  if (error) throw error
}

/** Sinaq bildirishi: Edge Function arqiliq (xuddi heqiqiy yol bilen). */
export async function sendTestPush(): Promise<boolean> {
  const { data, error } = await supabase().functions.invoke("send-reminders", { body: { test: true } })
  return !error && (data?.sent ?? 0) > 0
}
