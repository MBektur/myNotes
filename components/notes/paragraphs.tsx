import * as React from "react"
import { paragraphDir, splitParagraphs } from "@/lib/bidi"
import { cn } from "@/lib/utils"

/** Her paragraf (qur) öz yöniilishide (RTL/LTR) körsitilidu. Tugma ichide ishlitishke yaraydu (span). */
export const Paragraphs = React.forwardRef<HTMLSpanElement, { text: string; className?: string }>(
  function Paragraphs({ text, className }, ref) {
    return (
      <span ref={ref} className={cn("block", className)}>
        {splitParagraphs(text).map((line, i) => (
          <span key={i} dir={paragraphDir(line)} className="block text-start">
            {line || " "}
          </span>
        ))}
      </span>
    )
  }
)
