import JSZip from 'jszip'
import { db } from '../db/brandDb'
import { blobToDataUrl, dataUrlToBlob } from './files'

interface BackupFile {
  app: 'brandkit-studio'
  version: 1
  exportedAt: number
  brand: Record<string, unknown>
  colors: Record<string, unknown>[]
  fonts: Record<string, unknown>[]
  typeStyles: Record<string, unknown>[]
  logos: Record<string, unknown>[]
  socials: Record<string, unknown>[]
  assets: Record<string, unknown>[]
  savedPrompts?: Record<string, unknown>[]
  /** Solo en formato JSON: blobs embebidos como data URL */
  blobs?: Record<string, string>
}

const strip = <T extends { id?: number; brandId?: number }>(o: T) => {
  const { id: _id, brandId: _b, ...rest } = o
  void _id; void _b
  return rest as Record<string, unknown>
}

async function collect(brandId: number) {
  const [brand, colors, fonts, typeStyles, logos, socials, assets, savedPrompts] = await Promise.all([
    db.brands.get(brandId), db.colors.where('brandId').equals(brandId).toArray(), db.fonts.where('brandId').equals(brandId).toArray(),
    db.typeStyles.where('brandId').equals(brandId).toArray(), db.logos.where('brandId').equals(brandId).toArray(),
    db.socials.where('brandId').equals(brandId).toArray(), db.assets.where('brandId').equals(brandId).toArray(),
    db.savedPrompts.where('brandId').equals(brandId).toArray(),
  ])
  if (!brand) throw new Error('Marca no encontrada')
  const blobs = new Map<string, Blob>()
  let n = 0
  const ref = (rec: Record<string, unknown>, extFrom?: string) => {
    const b = rec.blob as Blob | undefined
    if (!b) return rec
    const key = `file-${n++}${extFrom ? '-' + extFrom.replace(/[^\w.]+/g, '_') : ''}`
    blobs.set(key, b)
    const { blob: _blob, ...rest } = rec
    void _blob
    return { ...rest, blobRef: key, blobType: b.type }
  }
  const data: BackupFile = {
    app: 'brandkit-studio', version: 1, exportedAt: Date.now(),
    brand: strip(brand), colors: colors.map(strip),
    fonts: fonts.map((f) => ref(strip(f), f.fileName)), typeStyles: typeStyles.map(strip),
    logos: logos.map((l) => ref(strip(l), l.name)), socials: socials.map(strip), assets: assets.map((a) => ref(strip(a), a.name)),
    savedPrompts: savedPrompts.map(strip),
  }
  return { data, blobs, name: brand.name }
}

export async function exportBackupJson(brandId: number) {
  const { data, blobs, name } = await collect(brandId)
  data.blobs = {}
  for (const [k, b] of blobs) data.blobs[k] = await blobToDataUrl(b)
  return { blob: new Blob([JSON.stringify(data)], { type: 'application/json' }), name }
}

export async function exportBackupZip(brandId: number) {
  const { data, blobs, name } = await collect(brandId)
  const zip = new JSZip()
  zip.file('brand.json', JSON.stringify(data, null, 2))
  const folder = zip.folder('files')!
  for (const [k, b] of blobs) folder.file(k, b)
  return { blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), name }
}

/** Importa un respaldo .json o .zip como una marca nueva. Devuelve el id creado. */
export async function importBackup(file: File): Promise<number> {
  let data: BackupFile
  const blobs = new Map<string, Blob>()
  if (/\.zip$/i.test(file.name) || file.type.includes('zip')) {
    const zip = await JSZip.loadAsync(file)
    const j = zip.file('brand.json')
    if (!j) throw new Error('El .zip no contiene brand.json')
    data = JSON.parse(await j.async('string'))
    const files = zip.folder('files')
    const jobs: Promise<void>[] = []
    files?.forEach((path, entry) => {
      if (entry.dir) return
      jobs.push(entry.async('blob').then((b) => { blobs.set(path, b) }))
    })
    await Promise.all(jobs)
  } else {
    data = JSON.parse(await file.text())
    if (data.blobs) for (const [k, v] of Object.entries(data.blobs)) blobs.set(k, await dataUrlToBlob(v))
  }
  if (data.app !== 'brandkit-studio') throw new Error('Archivo de respaldo no válido')

  const withBlob = (rec: Record<string, unknown>) => {
    const key = rec.blobRef as string | undefined
    const { blobRef: _r, blobType, ...rest } = rec
    void _r
    if (!key) return rest
    const raw = blobs.get(key)
    if (!raw) return rest
    return { ...rest, blob: blobType ? new Blob([raw], { type: String(blobType) }) : raw }
  }

  return db.transaction('rw', [db.brands, db.colors, db.fonts, db.typeStyles, db.logos, db.socials, db.assets, db.savedPrompts], async () => {
    const b = data.brand as { name: string }
    const brandId = await db.brands.add({ ...(data.brand as object), name: `${b.name} (importada)`, createdAt: Date.now() } as never)
    const add = (rows: Record<string, unknown>[]) => rows.map((r) => ({ ...withBlob(r), brandId })) as never[]
    await db.colors.bulkAdd(add(data.colors))
    await db.fonts.bulkAdd(add(data.fonts))
    await db.typeStyles.bulkAdd(add(data.typeStyles))
    await db.logos.bulkAdd(add(data.logos))
    await db.socials.bulkAdd(add(data.socials))
    await db.assets.bulkAdd(add(data.assets))
    await db.savedPrompts.bulkAdd(add(data.savedPrompts ?? []))
    return brandId
  })
}
