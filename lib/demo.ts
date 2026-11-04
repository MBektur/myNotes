import { todayStr } from "./filters"
import type { Note } from "./types"

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayStr(d)
}
const ago = (days: number, hour = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

let seq = 0
const mk = (o: Partial<Note> & { updated: number }): Note => {
  const { updated, ...rest } = o
  seq++
  return {
    id: `demo-${seq}`,
    status: "todo",
    tags: [],
    links: [],
    checklist: [],
    createdAt: ago(updated + 3),
    updatedAt: ago(updated, 9 + (seq % 8)),
    ...rest,
  }
}
const items = (list: [string, boolean][], p: string) =>
  list.map(([text, done], i) => ({ id: `${p}-${i}`, text, done }))

/** Uygurca demo xatiriler (id'ler sabit: qayta yüklense birleshtürüshte köpiymeydu). */
export function demoNotes(): Note[] {
  seq = 0
  return [
    mk({
      updated: 0, status: "in_progress", priority: "high", category: "تور بېكەت", color: "blue",
      title: "تور بېكەتنى يېڭىدىن لايىھىلەش", deadline: day(2), tags: ["لايىھە", "مۇھىم"],
      content: "باشبەت، ھەققىمىزدە ۋە ئالاقە بەتلىرىنى يېڭىلاش.",
      checklist: items([["رەسىم ماتېرىياللىرىنى يىغىش", true], ["باشبەتنىڭ لايىھىسى", true], ["ئالاقە بېتى", false], ["سىناق ۋە ئېلان قىلىش", false]], "a"),
      links: [{ id: "l1", url: "https://figma.com", label: "Figma" }],
    }),
    mk({
      updated: 1, status: "in_progress", priority: "medium", category: "سېتىش", color: "pink",
      title: "تەشۋىقات پائالىيىتى", deadline: day(5), tags: ["تەشۋىقات"],
      content: "ئاپرېل ئېيىدىكى ئىجتىمائىي تور پائالىيىتىنى پىلانلاش.",
      checklist: items([["مەزمۇن پىلانى", true], ["ئېلان رەسىملىرى", false], ["ۋاقىت جەدۋىلى", false]], "b"),
    }),
    mk({
      updated: 2, status: "review", priority: "medium", category: "ئەپ", color: "green",
      title: "يانفون ئەپ نەشرى 1.2", deadline: day(1), tags: ["ئەپ", "سىناق"],
      content: "يېڭى نەشرىنى تەكشۈرۈپ ئەپ دۇكىنىغا يوللاش.",
      checklist: items([["خاتالىق تۈزىتىش", true], ["ئىشلەتكۈچى سىنىقى", true], ["دۇكانغا يوللاش", false]], "c"),
    }),
    mk({
      updated: 3, status: "done", priority: "high", category: "تور بېكەت", color: "purple",
      title: "تۈر تەكلىپنامىسىنى يېزىش", tags: ["ھۆججەت"],
      content: "ئىشلەپچىقىرىش مۇددىتى ۋە بېجىرىش مەبلىغى كىرگۈزۈلدى.",
    }),
    mk({
      updated: 4, status: "todo", priority: "urgent", category: "ئەپ", color: "orange",
      title: "رىقابەتچىلەرنى تەتقىق قىلىش", deadline: day(-1), tags: ["تەتقىقات"],
      content: "ئوخشاش ئەپلەرنىڭ ئالاھىدىلىكى ۋە باھاسىنى سېلىشتۇرۇش.",
    }),
    mk({
      updated: 0, status: "todo", priority: "low", category: "ئۆگىنىش", color: "teal",
      title: "ئۇيغۇرچە Next.js دەرسلىكى", deadline: day(7), tags: ["ئۆگىنىش", "كود"],
      content: "ھەر كۈنى 30 مىنۇت ئۆگىنىش.",
      checklist: items([["React ئاساسلىرى", true], ["Tailwind", true], ["Next.js 16 ھۆججىتى", false], ["كىچىك تۈر ياساش", false], ["ئېلان قىلىش", false]], "d"),
      links: [{ id: "l2", url: "https://nextjs.org/docs", label: "Next.js Docs" }],
    }),
    mk({
      updated: 5, status: "done", priority: "low", category: "ئۆگىنىش", color: "teal",
      title: "ئىنگلىزچە 20 سۆز يادلاش", tags: ["ئۆگىنىش"],
    }),
    mk({
      updated: 1, status: "todo", priority: "medium", category: "شەخسىي", color: "pink",
      title: "ئاتا-ئانامغا تېلېفون قىلىش", deadline: day(0), tags: ["ئائىلە"],
      content: "ھەپتە ئاخىرىدا ئائىلىۋى سۆھبەت ۋاقتىنى كېلىشىش.",
    }),
    mk({
      updated: 2, status: "in_progress", priority: "high", category: "شەخسىي", color: "orange",
      title: "ساغلاملىق پىلانى", tags: ["ساغلاملىق"],
      content: "ھەر كۈنى ئۇخلاشتىن ئىلگىرى ئوقۇش، ئەتىگەندە يۈگۈرۈش.",
      checklist: items([["سۇ ئىچىش (8 ئىستاكان)", true], ["20 مىنۇت يۈگۈرۈش", true], ["10 مىنۇت مېدىتاتسىيە", false]], "e"),
    }),
    mk({
      updated: 6, status: "done", category: "سېتىش", color: "blue",
      title: "ھەپتىلىك يىغىن خاتىرىسى", tags: ["يىغىن"],
      content: "ئاساسىي قارارلار: ئاۋۋال ئەپنى تاماملاندىلاش، ئاندىن تەشۋىقات.",
    }),
    mk({
      updated: 3, status: "review", priority: "low", category: "ئەپ", color: "purple",
      title: "ئىشلەتكۈچى قوللانمىسى", deadline: day(10), tags: ["ھۆججەت"],
    }),
    mk({
      updated: 0, status: "todo", priority: "medium", category: "تور بېكەت", color: "green",
      title: "ئانالىز مەلۇماتلىرىنى تەكشۈرۈلۈۋاتىدۇ", deadline: day(3), tags: ["ئانالىز"],
      content: "ئۆتكەن ئايدىكى زىيارەتچىلەر سانى ۋە ئۇلانما چېكىلىشى.",
    }),
  ]
}
