const MAX_EDGE = 1600
const QUALITY = 0.82

/** Resimni kichikletip WebP'gha aylandurudu (ücretsiz Storage kvotisini tejesh üchün). Mümkin bolmisa asli fayl qayturulidu. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", QUALITY))
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" })
  } catch {
    return file
  }
}
