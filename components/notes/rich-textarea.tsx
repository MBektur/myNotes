"use client"

import * as React from "react"
import { Bold, Highlighter, Italic, List, ListOrdered, Strikethrough } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/ui/hint"
import { Textarea } from "@/components/ui/textarea"
import { paragraphAt, paragraphDir } from "@/lib/bidi"
import { t } from "@/lib/i18n"
import { continueList, toggleList, toggleWrap, type Edit, type Mark } from "@/lib/richtext"
import { ug } from "@/lib/ug"

/** Addiy formatlash tulbiri bar yézish qutisi (Markdown qisimi: qelin, yantu, sizilghan, ajritish, nuqtiliq / nomurluq tizimlik). */
export function RichTextarea({ value, onChange, rows = 4 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [caret, setCaret] = React.useState(0)
  const pending = React.useRef<[number, number] | null>(null)

  // Qiymet yéngilanghandin kéyin tallashni (selection) qayturimiz
  React.useLayoutEffect(() => {
    const sel = pending.current
    const el = ref.current
    if (!sel || !el) return
    pending.current = null
    el.focus()
    el.setSelectionRange(sel[0], sel[1])
  }, [value])

  function apply(edit: Edit) {
    pending.current = [edit.start, edit.end]
    setCaret(edit.end)
    onChange(ug(edit.value))
  }
  const sel = () => {
    const el = ref.current!
    return [el.selectionStart, el.selectionEnd] as const
  }
  type Tool = "bold" | "italic" | "strike" | "highlight" | "bullet" | "numbered"
  const MARKS: Partial<Record<Tool, Mark>> = { bold: "**", italic: "*", strike: "~~", highlight: "==" }
  function act(tool: Tool) {
    const [s, e] = sel()
    const mark = MARKS[tool]
    apply(mark ? toggleWrap(value, s, e, mark) : toggleList(value, s, e, tool === "bullet" ? "ul" : "ol"))
  }

  const tools: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "bold", label: t.form.fmt.bold, icon: <Bold /> },
    { id: "italic", label: t.form.fmt.italic, icon: <Italic /> },
    { id: "strike", label: t.form.fmt.strike, icon: <Strikethrough /> },
    { id: "highlight", label: t.form.fmt.highlight, icon: <Highlighter /> },
    { id: "bullet", label: t.form.fmt.bullet, icon: <List /> },
    { id: "numbered", label: t.form.fmt.numbered, icon: <ListOrdered /> },
  ]

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-0.5" role="toolbar" aria-label={t.form.content}>
        {tools.map((tool, i) => (
          <Hint key={tool.label} label={tool.label} side="top" align={i === 0 ? "start" : "center"}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={tool.label}
              // Tugma bosulghanda yézish qutisining fokusi yoqalmisun
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => act(tool.id)}
            >
              {tool.icon}
            </Button>
          </Hint>
        ))}
      </div>
      <Textarea
        ref={ref}
        value={value}
        dir={paragraphDir(paragraphAt(value, caret))}
        className="text-start"
        rows={rows}
        onChange={(e) => {
          onChange(ug(e.target.value))
          setCaret(e.currentTarget.selectionStart)
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          const mod = e.metaKey || e.ctrlKey
          if (mod && !e.shiftKey && !e.altKey && (e.key === "b" || e.key === "B")) {
            e.preventDefault()
            act("bold")
          } else if (mod && !e.shiftKey && !e.altKey && (e.key === "i" || e.key === "I")) {
            e.preventDefault()
            act("italic")
          } else if (e.key === "Enter" && !e.shiftKey && !mod && !e.altKey) {
            const [s, en] = sel()
            if (s !== en) return
            const edit = continueList(value, s)
            if (edit) {
              e.preventDefault()
              apply(edit)
            }
          }
        }}
      />
    </div>
  )
}
