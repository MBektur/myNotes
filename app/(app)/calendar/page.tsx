import type { Metadata } from "next"
import { CalendarPage } from "@/components/notes/calendar-page"

export const metadata: Metadata = { title: "myNotes · Teqwim" }

// AuthGate arqisida, peqet istemci tarapta: instant-navigation tekshürüshi kerek emes
export const instant = false

export default function Calendar() {
  return <CalendarPage />
}
