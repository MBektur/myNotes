"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useWorkspaces } from "@/lib/workspaces-store"

/** workspaceId'ni ad + emoji bilen körsitidu; workspace tépilmisa héchnéme sizmaydu. */
export function WorkspaceBadge({
  id,
  variant = "secondary",
  className,
}: {
  id?: string
  variant?: React.ComponentProps<typeof Badge>["variant"]
  className?: string
}) {
  const ws = useWorkspaces().find((w) => w.id === id)
  if (!ws) return null
  return (
    <Badge variant={variant} className={cn(`note-${ws.color ?? "blue"} bg-(--note-chip)`, className)}>
      <span aria-hidden>{ws.emoji ?? "📁"}</span>
      <span dir="auto">{ws.name}</span>
    </Badge>
  )
}
