"use client"

import * as React from "react"

/** Resim/PDF fayllar IndexedDB'de saqlinidu (localStorage kichik). Xatire peqet metadata'ni saqlaydu. */
const DB = "mynotes-files"
const STORE = "blobs"

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = fn(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const putBlob = (id: string, blob: Blob) => run("readwrite", (s) => s.put(blob, id)).then(() => {})
export const getBlob = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id))

export async function deleteBlobs(ids: string[]) {
  if (!ids.length) return
  try {
    const db = await open()
    const tx = db.transaction(STORE, "readwrite")
    ids.forEach((id) => tx.objectStore(STORE).delete(id))
    tx.oncomplete = () => db.close()
  } catch {
    /* IndexedDB yoq (private mode) */
  }
}

/** Fayl üchün object URL. `pending` bolsa (téxi saqlanmighan) shuni, bolmisa IndexedDB'dan oquydu. */
export function useBlobUrl(id: string, pending?: Blob): string | null {
  const [url, setUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    let revoked = false
    let created: string | null = null
    const set = (b?: Blob) => {
      if (!b || revoked) return
      created = URL.createObjectURL(b)
      setUrl(created)
    }
    if (pending) set(pending)
    else getBlob(id).then(set).catch(() => {})
    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [id, pending])
  return url
}
