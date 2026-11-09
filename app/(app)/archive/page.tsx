import type { Metadata } from "next"
import { ArchivePage } from "@/components/notes/archive-page"

export const metadata: Metadata = { title: "myNotes · ئارخىپ" }

// AuthGate arqisida, peqet istemci tarapta: instant-navigation tekshürüshi kerek emes
export const instant = false

export default function Archive() {
  return <ArchivePage />
}
