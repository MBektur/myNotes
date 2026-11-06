import * as React from "react"
import { paragraphDir } from "@/lib/bidi"
import { parseBlocks } from "@/lib/richtext"
import { cn } from "@/lib/utils"

// Eng aldi tépilghan belgini tallaymiz; ichige qaytidin kirip ichma-ich (mes. qelin ichide yantu) körsitilidu.
const RULES: { re: RegExp; tag: (children: React.ReactNode, key: number) => React.ReactNode }[] = [
  { re: /\*\*\*(\S(?:.*?\S)?)\*\*\*/, tag: (c, key) => <strong key={key}><em>{c}</em></strong> },
  { re: /\*\*(\S(?:.*?\S)?)\*\*/, tag: (c, key) => <strong key={key} className="font-bold">{c}</strong> },
  { re: /~~(\S(?:.*?\S)?)~~/, tag: (c, key) => <s key={key}>{c}</s> },
  {
    re: /==(\S(?:.*?\S)?)==/,
    tag: (c, key) => (
      <mark key={key} className="rounded bg-yellow-300/70 px-0.5 text-inherit dark:bg-yellow-400/30">{c}</mark>
    ),
  },
  { re: /\*([^\s*](?:.*?[^\s*])?)\*/, tag: (c, key) => <em key={key}>{c}</em> },
]

export function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let rest = text
  let key = 0
  while (rest) {
    let best: { m: RegExpExecArray; tag: (typeof RULES)[number]["tag"] } | null = null
    for (const r of RULES) {
      const m = r.re.exec(rest)
      if (m && (!best || m.index < best.m.index)) best = { m, tag: r.tag }
    }
    if (!best) {
      out.push(rest)
      break
    }
    if (best.m.index > 0) out.push(rest.slice(0, best.m.index))
    out.push(best.tag(renderInline(best.m[1]), key++))
    rest = rest.slice(best.m.index + best.m[0].length)
  }
  return out
}

/** Her paragraf (qur) öz yöniilishide (RTL/LTR) körsitilidu; **qelin** / *yantu* / ~~~~ / ==ajrim== we tizimlikler körsitilidu. Tugma ichide ishlitishke yaraydu (span). */
export const Paragraphs = React.forwardRef<HTMLSpanElement, { text: string; className?: string }>(
  function Paragraphs({ text, className }, ref) {
    return (
      <span ref={ref} className={cn("block", className)}>
        {parseBlocks(text).map((b, i) => {
          if (b.type === "p")
            return (
              <span key={i} dir={paragraphDir(b.text)} className="block text-start">
                {b.text ? renderInline(b.text) : " "}
              </span>
            )
          const items = b.type === "ul" ? b.items.map((t) => ({ marker: "•", text: t })) : b.items.map((it) => ({ marker: `${it.n}.`, text: it.text }))
          return (
            <span key={i} className="block">
              {items.map((it, j) => (
                <span key={j} dir={paragraphDir(it.text)} className="flex items-baseline gap-2 text-start">
                  <span aria-hidden className="shrink-0 tabular-nums opacity-70">{it.marker}</span>
                  <span className="min-w-0 flex-1">{renderInline(it.text)}</span>
                </span>
              ))}
            </span>
          )
        })}
      </span>
    )
  }
)
