import type { Metadata } from "next"
import { AboutPage } from "@/components/notes/about-page"

export const metadata: Metadata = { title: "myNotes · About" }

// AuthGate arqisida, peqet istemci tarapta: instant-navigation tekshürüshi kerek emes
export const instant = false

export default function About() {
  return <AboutPage />
}
