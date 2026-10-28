import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/** Descarga un Blob. En Android nativo lo guarda con Filesystem y abre el diálogo de compartir. */
export async function saveBlob(blob: Blob, filename: string) {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob)
    const res = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache })
    await Share.share({ title: filename, url: res.uri })
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve((r.result as string).split(',')[1])
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl: string) {
  return (await fetch(dataUrl)).blob()
}

/** Hook: URL de objeto para un Blob, liberada automáticamente. */
export function useBlobUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) { setUrl(undefined); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Rasteriza cualquier imagen (incluido SVG) a PNG con el tamaño dado, manteniendo proporción. */
export async function rasterize(blob: Blob, width: number, height = width, bg?: string): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height) }
    const iw = img.naturalWidth || width, ih = img.naturalHeight || height
    const scale = Math.min(width / iw, height / ih)
    const w = iw * scale, h = ih * scale
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h)
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Comparte texto: Capacitor Share en Android, Web Share API en navegador, o copia al portapapeles. */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied'> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: title })
      return 'shared'
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'shared'
  }
  await copyText(text)
  return 'copied'
}

export function slug(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'marca'
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
