import { AppShell } from "@/components/notes/app-shell"

// Uygulama kirish (AuthGate) arqisida, peqet istemci tarapta ishleydu: "instant navigation" tekshürüshi kerek emes.
export const instant = false

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
