import test from "node:test"
import assert from "node:assert/strict"
import { addDays, computeDue, dropLogged, localParts, mostUrgent, OVERDUE, type ReminderNote } from "./due.ts"
import { buildMessage } from "./messages.ts"

const note = (id: string, deadline: string): ReminderNote => ({ id, title: id, deadline })
const S = { offsets: [0, 1], sendTime: "09:00", tz: "UTC" }
const at = (iso: string) => new Date(iso)

test("localParts: saat dilimi", () => {
  assert.deepEqual(localParts(at("2026-11-06T22:30:00Z"), "Europe/Istanbul"), { date: "2026-11-07", minutes: 60 + 30 }) // 01:30
  assert.deepEqual(localParts(at("2026-11-06T22:30:00Z"), "Bad/Zone"), { date: "2026-11-06", minutes: 22 * 60 + 30 })
})

test("addDays ay/yil sinirini asar", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01")
  assert.equal(addDays("2026-03-01", -1), "2026-02-28")
})

test("son gun: saatinden once yok, sonra var", () => {
  const n = [note("a", "2026-11-10")]
  assert.deepEqual(computeDue(n, { ...S, offsets: [0] }, at("2026-11-10T08:59:00Z")), [])
  assert.deepEqual(computeDue(n, { ...S, offsets: [0] }, at("2026-11-10T09:00:00Z")), [{ noteId: "a", deadline: "2026-11-10", offset: 0 }])
})

test("1 gun once", () => {
  const n = [note("a", "2026-11-10")]
  const r = computeDue(n, { ...S, offsets: [1] }, at("2026-11-09T09:05:00Z"))
  assert.deepEqual(r, [{ noteId: "a", deadline: "2026-11-10", offset: 1 }])
})

test("24 saat penceresi: dun kacirildiysa yakalar, daha eskiyi yakalamaz", () => {
  const n = [note("a", "2026-11-10")]
  const s = { ...S, offsets: [0] }
  assert.equal(computeDue(n, s, at("2026-11-11T08:00:00Z")).filter((d) => d.offset === 0).length, 1) // dun 09:00 + <24sa
  assert.equal(computeDue(n, s, at("2026-11-11T09:30:00Z")).filter((d) => d.offset === 0).length, 0) // >24sa
})

test("suresi gecmis: ertesi gun bir kere", () => {
  const n = [note("a", "2026-11-10")]
  const r = computeDue(n, { ...S, offsets: [] }, at("2026-11-11T09:10:00Z"))
  assert.deepEqual(r, [{ noteId: "a", deadline: "2026-11-10", offset: OVERDUE }])
  assert.deepEqual(computeDue(n, { ...S, offsets: [] }, at("2026-11-20T09:10:00Z")), [])
})

test("tz: Istanbul 09:00 = 06:00Z", () => {
  const n = [note("a", "2026-11-10")]
  const s = { offsets: [0], sendTime: "09:00", tz: "Europe/Istanbul" }
  assert.equal(computeDue(n, s, at("2026-11-10T05:59:00Z")).length, 0)
  assert.equal(computeDue(n, s, at("2026-11-10T06:00:00Z")).length, 1)
})

test("gecersiz deadline yok sayilir, tekrarlar tek", () => {
  const r = computeDue([note("a", "bad"), note("b", "2026-11-10")], { ...S, offsets: [0, 0, -3, 1.5] }, at("2026-11-10T10:00:00Z"))
  assert.deepEqual(r, [{ noteId: "b", deadline: "2026-11-10", offset: 0 }])
})

test("log'dakiler cikarilir; deadline degisince yeniden", () => {
  const due = [{ noteId: "a", deadline: "2026-11-10", offset: 0 }]
  assert.equal(dropLogged(due, new Set(["a|2026-11-10|0"])).length, 0)
  assert.equal(dropLogged([{ ...due[0], deadline: "2026-11-12" }], new Set(["a|2026-11-10|0"])).length, 1)
})

test("mostUrgent", () => {
  const m = mostUrgent([
    { noteId: "a", deadline: "d", offset: 1 },
    { noteId: "a", deadline: "d", offset: 0 },
    { noteId: "b", deadline: "d", offset: 0 },
    { noteId: "b", deadline: "d", offset: OVERDUE },
  ])
  assert.equal(m.get("a"), 0)
  assert.equal(m.get("b"), OVERDUE)
})

test("mesaj: tek / cok / diller", () => {
  const one = buildMessage([{ id: "x y", title: "Rapor", offset: 1 }], "tr")
  assert.deepEqual([one.title, one.body, one.url], ["Rapor", "Son gün yarın", "/notes#note=x%20y"])
  const many = buildMessage([1, 2, 3, 4].map((i) => ({ id: String(i), title: null, offset: 0 })), "en")
  assert.equal(many.title, "4 notes need attention")
  assert.ok(many.body.endsWith("…"))
  assert.equal(buildMessage([{ id: "1", title: "x", offset: -1 }], "en").body, "Overdue")
})
