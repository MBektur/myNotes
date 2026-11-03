// Mexpiy sözning SHA-256 hash'i. Yéngi mexpiy söz üchün:
//   printf 'YENGI_SOZ' | shasum -a 256
// we netijini mushu yerge yapshuring.
export const PASSWORD_HASH =
  "55f2cd0c826c8228432e0ea99717d4d5b18130cd68d448879f2531e280a2fa5d"

const AUTH_KEY = "mynotes:auth"

async function sha256(text: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function checkPassword(input: string) {
  return (await sha256(input)) === PASSWORD_HASH
}

export function isAuthed() {
  try {
    return localStorage.getItem(AUTH_KEY) === PASSWORD_HASH
  } catch {
    return false
  }
}

export function setAuthed() {
  try {
    localStorage.setItem(AUTH_KEY, PASSWORD_HASH)
  } catch {}
}

export function logout() {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {}
}
