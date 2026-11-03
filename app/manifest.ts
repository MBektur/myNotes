import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "myNotes",
    short_name: "myNotes",
    description: "شەخسىي خاتىرە ۋە ۋەزىپە تاختىسى",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ug",
    background_color: "#fbf3ee",
    theme_color: "#fbf3ee",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
