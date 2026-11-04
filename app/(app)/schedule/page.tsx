import type { Metadata } from "next"
import { SchedulePage } from "@/components/notes/schedule-page"

export const metadata: Metadata = { title: "myNotes ھەپتىلىك ئورۇنلاشتۇرۇش" }

// AuthGate arqisida, peqet istemci tarapta: instant-navigation tekshürüshi kerek emes
export const instant = false

export default function Schedule() {
  return <SchedulePage />
}
