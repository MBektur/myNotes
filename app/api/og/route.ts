import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

/** Link üchün Open Graph metadata (title, description, image). Brauzerdin CORS tosidu, shunga serverda oqulidu. */

const TIMEOUT_MS = 5000
const MAX_BYTES = 512 * 1024
const MAX_REDIRECTS = 3

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number)
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    )
  }
  const v = ip.toLowerCase()
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7))
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")
}

async function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol")
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("private")
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error("private")
}

async function fetchHtml(start: URL): Promise<{ html: string; url: URL }> {
  let url = start
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublic(url)
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; MyNotesLinkPreview/1.0)", accept: "text/html" },
    })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) throw new Error("redirect")
      url = new URL(loc, url)
      continue
    }
    if (!res.ok) throw new Error("status")
    if (!(res.headers.get("content-type") ?? "").includes("html")) throw new Error("type")
    const reader = res.body?.getReader()
    if (!reader) throw new Error("body")
    const chunks: Uint8Array[] = []
    let size = 0
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      size += value.length
    }
    reader.cancel().catch(() => {})
    return { html: new TextDecoder().decode(Buffer.concat(chunks)), url }
  }
  throw new Error("redirects")
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim()

function metaContent(html: string, keys: string[]): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase()
    if (!key || !keys.includes(key)) continue
    const content = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag)
    const v = content?.[1] ?? content?.[2]
    if (v) return decode(v)
  }
}

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url")
  if (!raw) return Response.json({ error: "url" }, { status: 400 })
  try {
    const { html, url } = await fetchHtml(new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`))
    const head = html.slice(0, MAX_BYTES)
    const title =
      metaContent(head, ["og:title", "twitter:title"]) ??
      (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ? decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)![1]) : undefined)
    const description = metaContent(head, ["og:description", "twitter:description", "description"])
    const imageRaw = metaContent(head, ["og:image", "og:image:url", "twitter:image"])
    let image: string | undefined
    try {
      const u = imageRaw ? new URL(imageRaw, url) : undefined
      if (u && (u.protocol === "https:" || u.protocol === "http:")) image = u.toString()
    } catch {}
    const siteName = metaContent(head, ["og:site_name"]) ?? url.hostname.replace(/^www\./, "")
    return Response.json(
      { url: url.toString(), title, description, image, siteName },
      { headers: { "cache-control": "public, max-age=3600" } }
    )
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502 })
  }
}
