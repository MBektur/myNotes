import type { Metadata } from "next"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { t } from "@/lib/i18n"

export const metadata: Metadata = { title: "myNotes · 404" }

export default function NotFound() {
  return (
    <div className="clay mx-auto my-auto flex w-full max-w-lg flex-col items-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold tabular-nums text-primary" dir="ltr">404</p>
      <h1>{t.notFound.title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{t.notFound.body}</p>
      <Link href="/" className={buttonVariants({ className: "mt-2" })}>
        {t.notFound.home}
      </Link>
    </div>
  )
}
