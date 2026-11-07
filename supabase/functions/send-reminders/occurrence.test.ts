import test from "node:test"
import assert from "node:assert/strict"
import {
  computeNoteDue,
  fromMin,
  lastOccurrence,
  localNowMin,
  nextOccurrence,
  parseReminders,
  toMin,
  type ReminderRule,
} from "./occurrence.ts"

const m = (s: string) => toMin(s)!
const last = (r: ReminderRule, now: string) => {
  const v = lastOccurrence(r, m(now))
  return v === null ? null : fromMin(v)
}
const next = (r: ReminderRule, now: string) => {
  const v = nextOccurrence(r, m(now))
  return v === null ? null : fromMin(v)
}

test("toMin/fromMin", () => {
  assert.equal(fromMin(m("2026-11-07T09:30")), "2026-11-07T09:30")
  assert.equal(toMin("2026-11-07"), null)
  assert.equal(toMin("2026-13-01T00:00"), null)
})

test("localNowMin: saat dilimi", () => {
  assert.equal(fromMin(localNowMin(new Date("2026-11-06T22:30:00Z"), "Europe/Istanbul")), "2026-11-07T01:30")
})

test("tek seferlik", () => {
  const r = { id: "a", at: "2026-11-07T09:00" }
  assert.equal(last(r, "2026-11-07T08:59"), null)
  assert.equal(last(r, "2026-11-07T09:00"), "2026-11-07T09:00")
  assert.equal(last(r, "2026-11-09T09:00"), "2026-11-07T09:00")
  assert.equal(next(r, "2026-11-07T08:00"), "2026-11-07T09:00")
  assert.equal(next(r, "2026-11-07T09:01"), null)
})

test("her gun", () => {
  const r: ReminderRule = { id: "a", at: "2026-11-07T09:00", repeat: { every: 1, unit: "day" } }
  assert.equal(last(r, "2026-11-10T08:59"), "2026-11-09T09:00")
  assert.equal(last(r, "2026-11-10T09:00"), "2026-11-10T09:00")
  assert.equal(next(r, "2026-11-10T09:01"), "2026-11-11T09:00")
  assert.equal(next(r, "2026-11-10T09:00"), "2026-11-10T09:00")
})

test("her 3 saatte", () => {
  const r: ReminderRule = { id: "a", at: "2026-11-07T22:00", repeat: { every: 3, unit: "hour" } }
  assert.equal(last(r, "2026-11-08T02:30"), "2026-11-08T01:00")
  assert.equal(next(r, "2026-11-08T02:30"), "2026-11-08T04:00")
})

test("her 15 dakikada", () => {
  const r: ReminderRule = { id: "a", at: "2026-11-07T09:00", repeat: { every: 15, unit: "minute" } }
  assert.equal(last(r, "2026-11-07T09:44"), "2026-11-07T09:30")
  assert.equal(next(r, "2026-11-07T09:44"), "2026-11-07T09:45")
  assert.equal(next(r, "2026-11-07T23:59"), "2026-11-08T00:00")
})

test("computeNoteDue: her dakika, sadece o dakika", () => {
  const notes = [{ id: "n", reminders: [{ id: "m", at: "2026-11-07T09:00", repeat: { every: 1, unit: "minute" } }] }]
  assert.deepEqual(computeNoteDue(notes, "UTC", new Date("2026-11-07T09:07:30Z")).map((d) => d.fireAt), ["2026-11-07T09:07"])
})

test("her 2 haftada", () => {
  const r: ReminderRule = { id: "a", at: "2026-11-02T10:00", repeat: { every: 2, unit: "week" } }
  assert.equal(last(r, "2026-11-20T10:00"), "2026-11-16T10:00")
  assert.equal(next(r, "2026-11-20T10:00"), "2026-11-30T10:00")
})

test("her ay 31'i: ay sonuna kirpilir, gun korunur", () => {
  const r: ReminderRule = { id: "a", at: "2026-01-31T09:00", repeat: { every: 1, unit: "month" } }
  assert.equal(last(r, "2026-02-28T09:00"), "2026-02-28T09:00")
  assert.equal(last(r, "2026-02-28T08:00"), "2026-01-31T09:00")
  assert.equal(last(r, "2026-03-31T10:00"), "2026-03-31T09:00")
  assert.equal(next(r, "2026-04-01T00:00"), "2026-04-30T09:00")
})

test("her 3 ayda, yil siniri", () => {
  const r: ReminderRule = { id: "a", at: "2026-11-15T09:00", repeat: { every: 3, unit: "month" } }
  assert.equal(last(r, "2027-01-20T00:00"), "2026-11-15T09:00")
  assert.equal(next(r, "2027-01-20T00:00"), "2027-02-15T09:00")
})

test("parseReminders: bozuk kayitlari atar", () => {
  const out = parseReminders([
    { id: "a", at: "2026-11-07T09:00" },
    { id: "b", at: "yanlis" },
    { id: "c", at: "2026-11-07T09:00", repeat: { every: 0, unit: "day" } },
    { id: "d", at: "2026-11-07T09:00", repeat: { every: 2, unit: "year" } },
    null,
  ])
  assert.deepEqual(out, [
    { id: "a", at: "2026-11-07T09:00" },
    { id: "c", at: "2026-11-07T09:00" },
    { id: "d", at: "2026-11-07T09:00" },
  ])
  assert.deepEqual(parseReminders("x"), [])
})

test("computeNoteDue: pencere", () => {
  const notes = [
    { id: "n1", reminders: [{ id: "once", at: "2026-11-07T09:00" }] },
    { id: "n2", reminders: [{ id: "hourly", at: "2026-11-07T06:00", repeat: { every: 1, unit: "hour" } }] },
    { id: "n3", reminders: [{ id: "old", at: "2026-11-05T09:00" }] }, // 24 saatten eski
    { id: "n4", reminders: [{ id: "future", at: "2026-11-08T09:00" }] },
  ]
  const now = new Date("2026-11-07T09:20:00Z")
  assert.deepEqual(computeNoteDue(notes, "UTC", now), [
    { noteId: "n1", reminderId: "once", fireAt: "2026-11-07T09:00" },
    { noteId: "n2", reminderId: "hourly", fireAt: "2026-11-07T09:00" },
  ])
})

test("computeNoteDue: saatlik tekrar bir onceki saati yagdirmaz", () => {
  const notes = [{ id: "n", reminders: [{ id: "h", at: "2026-11-07T06:00", repeat: { every: 1, unit: "hour" } }] }]
  // 09:59'da yalniz 09:00 gecerli
  assert.deepEqual(computeNoteDue(notes, "UTC", new Date("2026-11-07T09:59:00Z")).map((d) => d.fireAt), ["2026-11-07T09:00"])
})

test("buildNoteReminders: not basina bir bildirim, 3'ten fazlasi gruplanir", async () => {
  const { buildNoteReminders } = await import("./messages.ts")
  const one = buildNoteReminders([{ id: "n1", title: "Ödev", deadline: "2026-11-10" }], "tr")
  assert.deepEqual(one, [{ title: "Ödev", body: "⏰ Hatırlatma · Son gün: 2026-11-10", url: "/notes#note=n1", tag: "alarm-n1" }])
  const many = buildNoteReminders(["a", "b", "c", "d"].map((id) => ({ id, title: null, deadline: null })), "en")
  assert.equal(many.length, 1)
  assert.equal(many[0].title, "⏰ 4 reminders")
})
