import { NotebookPen } from "lucide-react"

/** Kirish tekshürülüwatqanda (JS yüklinishtin burun, serwer HTML'idimu) körünidighan yéngil ekran: boq ekranning aldini alidu. */
export function Splash() {
  return (
    <main className="app-bg flex min-h-screen items-center justify-center" aria-busy="true">
      <div className="flex size-14 animate-pulse items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <NotebookPen className="size-7" />
      </div>
    </main>
  )
}
