"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"
import type { NoteColor } from "@/lib/types"

export type Option = { value: string; label: string; icon?: string; color?: NoteColor }

/** Emoji + renk noqta (dot) bilen birge körsitilidighan label. */
export function OptionLabel({ option, className }: { option: Option; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {option.color && (
        <span
          aria-hidden
          className={`note-${option.color} size-2.5 shrink-0 rounded-full border border-foreground/20 bg-(--note-chip)`}
        />
      )}
      {option.icon && <span aria-hidden className="shrink-0">{option.icon}</span>}
      <span className="truncate" dir="auto">{option.label}</span>
    </span>
  )
}

/** Izdesh mümkin bolghan (searchable) köp tallash qutisi: Popover + cmdk. */
export function MultiSelect({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
  className,
}: {
  label: string
  /** Label aldidiki kichik ikon */
  icon?: LucideIcon
  options: Option[]
  selected: string[]
  onChange: (v: string[]) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const byValue = new Map(options.map((o) => [o.value, o]))
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Label className="gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className="flex h-8 w-full items-center justify-between gap-1 rounded-xl border border-input bg-background/60 px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {selected.length === 0 && <span className="truncate text-foreground/80">{t.all}</span>}
            {selected.length > 0 && selected.length <= 2 &&
              selected.map((v) => (
                <Badge key={v} variant="secondary" className="max-w-28">
                  <OptionLabel option={byValue.get(v) ?? { value: v, label: v }} />
                </Badge>
              ))}
            {selected.length > 2 && <Badge>{t.multi.selected(selected.length)}</Badge>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder={t.search} />
            <CommandList>
              <CommandEmpty>{t.noResults}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const on = selected.includes(o.value)
                  return (
                    <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                      <Check className={cn("size-4", !on && "opacity-0")} />
                      <OptionLabel option={o} className="flex-1" />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex w-full items-center justify-center gap-1 border-t px-2 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" /> {t.multi.clear}
              </button>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
