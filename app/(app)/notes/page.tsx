import type { Metadata } from "next"
import { NotesPage } from "@/components/notes/notes-page"

export const metadata: Metadata = { title: "myNotes · خاتىرىلەر" }

// AuthGate arqisida, peqet istemci tarapta: instant-navigation tekshürüshi kerek emes
export const instant = false

export default function Notes() {
  return <NotesPage />
}
