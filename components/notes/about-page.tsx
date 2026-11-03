"use client"

import Image from "next/image"
import { t } from "@/lib/i18n"

export function AboutPage() {
  return (
    <div className="clay mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-8 text-center">
      <div className="clay size-32 overflow-hidden rounded-[2rem] p-1.5">
        <Image
          src="/img/3d-avatar.jpg"
          alt=""
          width={256}
          height={256}
          className="size-full rounded-[1.5rem] object-cover"
        />
      </div>
      <h2>{t.appName} 💜</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">{t.about.body}</p>
      <p className="text-xs text-muted-foreground">{t.about.local}</p>
      <p className="text-xs text-muted-foreground">{t.about.install}</p>
    </div>
  )
}
