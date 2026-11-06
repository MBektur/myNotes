"use client"

import * as React from "react"
import { Eye, EyeOff, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { t } from "@/lib/i18n"

type Props = Omit<React.ComponentProps<"input">, "dir"> & { icon: LucideIcon }

/** Sol tarafta ikonlu giriş alanı (alan LTR; ikon fiziksel sol). Şifre alanında göster/gizle düğmesi çıkar. */
export function IconInput({ icon: Icon, type, className, ...props }: Props) {
  const [shown, setShown] = React.useState(false)
  const isPassword = type === "password"
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        dir="ltr"
        type={isPassword && shown ? "text" : type}
        className={`pl-8 ${isPassword ? "pr-8" : ""} ${className ?? ""}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={shown ? t.login.hidePassword : t.login.showPassword}
          title={shown ? t.login.hidePassword : t.login.showPassword}
          onClick={() => setShown((v) => !v)}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  )
}
