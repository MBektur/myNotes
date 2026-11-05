/** Paragrafning yöniilishi: san bolmighan, herp bar birinchi herpke qarap (RTL bolsa rtl, bolmisa ltr). */
const RTL_RE = /[֐-ࣿיִ-﷿ﹰ-﻿]/
const LETTER_RE = /\p{L}/u

export function paragraphDir(text: string): "rtl" | "ltr" {
  const first = text.match(LETTER_RE)?.[0]
  return first && RTL_RE.test(first) ? "rtl" : "ltr"
}

export const splitParagraphs = (text: string) => text.split("\n")

/** Imlec (caret) turghan paragraf */
export function paragraphAt(text: string, caret: number) {
  const start = text.lastIndexOf("\n", Math.max(0, caret - 1)) + 1
  const from = caret === 0 ? 0 : text[caret - 1] === "\n" ? caret : start
  const end = text.indexOf("\n", from)
  return text.slice(from, end === -1 ? undefined : end)
}
