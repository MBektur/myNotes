import { DashboardPage } from "@/components/notes/dashboard-page"

// AuthGate arqisida, peqet istemci tarapta: instant-navigation tekshürüshi kerek emes
export const instant = false

export default function Home() {
  return <DashboardPage />
}
