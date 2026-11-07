// Bildirim tékistliri (lib/i18n bilen ayrim: Edge Function Deno'da ishleydu, uningdin import qilmaydu).
export type Locale = "ug" | "en" | "tr"
export type Item = { id: string; title: string | null; offset: number } // offset: 0 bügün, N kün qaldi, -1 ötüp ketti

type Dict = {
  untitled: string
  today: string
  inDays: (n: number) => string
  overdue: string
  many: (n: number) => string
}

const dicts: Record<Locale, Dict> = {
  ug: {
    untitled: "ماۋزۇسىز",
    today: "بۈگۈن ئاخىرقى مۇددەت",
    inDays: (n) => (n === 1 ? "ئەتە ئاخىرقى مۇددەت" : `${n} كۈن قالدى`),
    overdue: "مۇددىتى ئۆتۈپ كەتتى",
    many: (n) => `${n} خاتىرىنىڭ مۇددىتى يېقىنلاشتى`,
  },
  en: {
    untitled: "Untitled",
    today: "Due today",
    inDays: (n) => (n === 1 ? "Due tomorrow" : `Due in ${n} days`),
    overdue: "Overdue",
    many: (n) => `${n} notes need attention`,
  },
  tr: {
    untitled: "Başlıksız",
    today: "Son gün bugün",
    inDays: (n) => (n === 1 ? "Son gün yarın" : `${n} gün kaldı`),
    overdue: "Süresi geçti",
    many: (n) => `${n} notun son tarihi yaklaşıyor`,
  },
}

const line = (d: Dict, i: Item) => (i.offset === -1 ? d.overdue : i.offset === 0 ? d.today : d.inDays(i.offset))

export function buildMessage(items: Item[], locale: Locale) {
  const d = dicts[locale] ?? dicts.ug
  if (items.length === 1) {
    const [i] = items
    return { title: i.title?.trim() || d.untitled, body: line(d, i), url: `/notes#note=${encodeURIComponent(i.id)}`, tag: `note-${i.id}` }
  }
  const shown = items.slice(0, 3).map((i) => `• ${i.title?.trim() || d.untitled} — ${line(d, i)}`)
  if (items.length > 3) shown.push("…")
  return { title: d.many(items.length), body: shown.join("\n"), url: "/notes", tag: "reminders" }
}

// Nota xas hatirlatma (alarm)
export type NoteItem = { id: string; title: string | null; deadline: string | null }

const alarm: Record<Locale, { body: string; due: (d: string) => string; many: (n: number) => string }> = {
  ug: { body: "⏰ ئەسكەرتىش", due: (d) => `ئاخىرقى مۇددەت: ${d}`, many: (n) => `⏰ ${n} ئەسكەرتىش` },
  en: { body: "⏰ Reminder", due: (d) => `Due: ${d}`, many: (n) => `⏰ ${n} reminders` },
  tr: { body: "⏰ Hatırlatma", due: (d) => `Son gün: ${d}`, many: (n) => `⏰ ${n} hatırlatma` },
}

/** Bir not -> bir bildirish; köp bolsa (> 3) birleshtürülidu. */
export function buildNoteReminders(items: NoteItem[], locale: Locale) {
  const d = dicts[locale] ?? dicts.ug
  const a = alarm[locale] ?? alarm.ug
  const name = (i: NoteItem) => i.title?.trim() || d.untitled
  if (items.length > 3) {
    const shown = items.slice(0, 3).map((i) => `• ${name(i)}`)
    shown.push("…")
    return [{ title: a.many(items.length), body: shown.join("\n"), url: "/notes", tag: "note-reminders" }]
  }
  return items.map((i) => ({
    title: name(i),
    body: i.deadline ? `${a.body} · ${a.due(i.deadline)}` : a.body,
    url: `/notes#note=${encodeURIComponent(i.id)}`,
    tag: `alarm-${i.id}`,
  }))
}

const tests: Record<Locale, { title: string; body: string }> = {
  ug: { title: "myNotes", body: "ئەسكەرتىش ئىشلەۋاتىدۇ ✅" },
  en: { title: "myNotes", body: "Reminders are working ✅" },
  tr: { title: "myNotes", body: "Hatırlatmalar çalışıyor ✅" },
}
export const testMessage = (locale: Locale) => ({ ...(tests[locale] ?? tests.ug), url: "/notes", tag: "test" })
