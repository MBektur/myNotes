/**
 * Xatire mezmuni addiy Markdown qisimi bilen saqlinidu (xet bolghachqa export / import / izdesh özgermeydu):
 *   **qelin**  *yantu*  ~~sizilghan~~  ==ajritilghan==   qur bashida "- " (nuqtiliq) yaki "1. " (nomurluq)
 */
export type Edit = { value: string; start: number; end: number }

export type Mark = "**" | "*" | "~~" | "=="

/** Tallanghan xetni belgige orap qoyidu; eger alliqachan oralghan bolsa — élip tashlaydu. */
export function toggleWrap(value: string, start: number, end: number, mark: Mark): Edit {
  const m = mark.length
  const before = value.slice(Math.max(0, start - m), start)
  const after = value.slice(end, end + m)
  // "*" yantu belgisi "**" qelinning bir qismi bolushi mumkin: shu chaghda orashni élip tashlimaymiz
  const partOfBold = mark === "*" && (value[start - 2] === "*" || value[end + 1] === "*")
  if (before === mark && after === mark && !partOfBold) {
    return { value: value.slice(0, start - m) + value.slice(start, end) + value.slice(end + m), start: start - m, end: end - m }
  }
  const sel = value.slice(start, end)
  if (sel.length >= 2 * m && sel.startsWith(mark) && sel.endsWith(mark) && !(mark === "*" && sel.startsWith("**"))) {
    const inner = sel.slice(m, sel.length - m)
    return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length }
  }
  return { value: value.slice(0, start) + mark + sel + mark + value.slice(end), start: start + m, end: end + m }
}

const LIST_PREFIX = /^\s*(?:[-•]|\d+[.)])\s+/
const UL_RE = /^\s*[-•]\s+/
const OL_RE = /^\s*\d+[.)]\s+/

/** Tallanghan qurlarni nuqtiliq / nomurluq tizimlikke aylandurush yaki qayturush. */
export function toggleList(value: string, start: number, end: number, kind: "ul" | "ol"): Edit {
  const ls = value.lastIndexOf("\n", start - 1) + 1
  // Tallash keyinki qurning bashida tügise, shu qurni qoshmaymiz
  const effEnd = end > start && value[end - 1] === "\n" ? end - 1 : end
  let le = value.indexOf("\n", effEnd)
  if (le === -1) le = value.length
  const lines = value.slice(ls, le).split("\n")
  const re = kind === "ul" ? UL_RE : OL_RE
  const filled = lines.filter((l) => l.trim() !== "")
  const off = filled.length > 0 && filled.every((l) => re.test(l))
  let n = 0
  const out = lines.map((l) => {
    if (off) return l.replace(LIST_PREFIX, "")
    if (l.trim() === "" && lines.length > 1) return l
    const body = l.replace(LIST_PREFIX, "")
    return kind === "ul" ? `- ${body}` : `${++n}. ${body}`
  })
  const block = out.join("\n")
  const next = value.slice(0, ls) + block + value.slice(le)
  return start === end
    ? { value: next, start: ls + block.length, end: ls + block.length }
    : { value: next, start: ls, end: ls + block.length }
}

/** Enter: tizimlikte bolsa keyinki bandni awtomatik qoshidu; boshluq bandta Enter tizimlikni tügitidu. */
export function continueList(value: string, caret: number): Edit | null {
  const ls = value.lastIndexOf("\n", caret - 1) + 1
  let le = value.indexOf("\n", caret)
  if (le === -1) le = value.length
  const line = value.slice(ls, le)
  const ul = /^(\s*)([-•])\s+(.*)$/.exec(line)
  const ol = /^(\s*)(\d+)([.)])\s+(.*)$/.exec(line)
  if (!ul && !ol) return null
  const body = ul ? ul[3] : ol![4]
  if (body.trim() === "") {
    return { value: value.slice(0, ls) + value.slice(le), start: ls, end: ls }
  }
  const marker = ul ? `${ul[1]}${ul[2]} ` : `${ol![1]}${Number(ol![2]) + 1}${ol![3]} `
  const ins = "\n" + marker
  return { value: value.slice(0, caret) + ins + value.slice(caret), start: caret + ins.length, end: caret + ins.length }
}

export type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: { n: number; text: string }[] }

/** Qurlarni paragraf / tizimlik blokliri qilip toplaydu. */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  for (const line of text.split("\n")) {
    const ul = /^\s*[-•]\s+(.*)$/.exec(line)
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]
    if (ul) {
      if (last?.type === "ul") last.items.push(ul[1])
      else blocks.push({ type: "ul", items: [ul[1]] })
    } else if (ol) {
      const item = { n: Number(ol[1]), text: ol[2] }
      if (last?.type === "ol") last.items.push(item)
      else blocks.push({ type: "ol", items: [item] })
    } else blocks.push({ type: "p", text: line })
  }
  return blocks
}

/** Aldin körüsh / sarlawha üchün: belgilerni élip tashlaydu. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^\s*(?:[-•]|\d+[.)])\s+/gm, "")
    .replace(/\*\*\*(\S(?:.*?\S)?)\*\*\*/g, "$1")
    .replace(/\*\*(\S(?:.*?\S)?)\*\*/g, "$1")
    .replace(/~~(\S(?:.*?\S)?)~~/g, "$1")
    .replace(/==(\S(?:.*?\S)?)==/g, "$1")
    .replace(/\*([^\s*](?:.*?[^\s*])?)\*/g, "$1")
}
