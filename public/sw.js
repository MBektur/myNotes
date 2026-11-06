/* myNotes service worker: yalnız push bildirimi. Keshleme yoq (kona sehipe qalmasliqi üchün). */

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "myNotes", body: event.data ? event.data.text() : "" }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "myNotes", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      lang: data.lang || "ug",
      dir: data.dir || "auto",
      tag: data.tag, // ohshash tag: yéngisi kona bildirishning ornini alidu
      data: { url: data.url || "/notes" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || "/notes", self.location.origin)
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const w of wins) {
        if (new URL(w.url).origin === target.origin && "focus" in w) {
          await w.focus()
          // Ochuq ilovida: hash arqiliq xatirini achush (sehipe qayta yüklenmeydu)
          w.postMessage({ type: "open-url", url: target.pathname + target.hash })
          return
        }
      }
      await self.clients.openWindow(target.href)
    })()
  )
})
