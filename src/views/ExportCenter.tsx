import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import QRCodeStyling from 'qr-code-styling'
import JSZip from 'jszip'
import { FileText, QrCode, Image as ImageIcon, Archive, Upload, Download, Loader2, FileJson } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db } from '../db/brandDb'
import { PageHeader } from '../components/ui'
import { blobToDataUrl, rasterize, saveBlob, slug } from '../lib/files'
import { exportBackupJson, exportBackupZip, importBackup } from '../lib/backup'

function Card({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 flex flex-col gap-4 animate-fadeUp">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-accent-500/15 text-accent-500">{icon}</div>
        <div><h2 className="font-semibold">{title}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p></div>
      </div>
      {children}
    </section>
  )
}

export default function ExportCenter() {
  const { brand, setBrandId, setView, toast } = useApp()
  const brandId = brand!.id!
  const colors = useLiveQuery(() => db.colors.where('brandId').equals(brandId).sortBy('order'), [brandId], [])
  const logos = useLiveQuery(() => db.logos.where('brandId').equals(brandId).toArray(), [brandId], [])
  const socials = useLiveQuery(() => db.socials.where('brandId').equals(brandId).toArray(), [brandId], [])
  const [busy, setBusy] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try { await fn() } catch (e) { console.error(e); toast(e instanceof Error ? e.message : 'Ocurrió un error', 'error') } finally { setBusy(null) }
  }

  /* ───── PDF ───── */
  const pdf = () => run('pdf', async () => {
    const { buildBrandGuidelinesPdf } = await import('../lib/brandPdf')
    await saveBlob(await buildBrandGuidelinesPdf(brandId), `manual-de-marca-${slug(brand!.name)}.pdf`)
    toast('Manual de marca generado')
  })

  /* ───── QR ───── */
  const defaultUrl = socials.find((s) => s.network === 'web')?.url ?? socials[0]?.url ?? 'https://'
  const [qrData, setQrData] = useState('')
  const [qrFg, setQrFg] = useState('')
  const [qrBg, setQrBg] = useState('#FFFFFF')
  const [qrStyle, setQrStyle] = useState<'rounded' | 'dots' | 'square'>('rounded')
  const [useIcon, setUseIcon] = useState(true)
  const qrRef = useRef<HTMLDivElement>(null)
  const qrObj = useRef<QRCodeStyling | null>(null)
  const [iconUrl, setIconUrl] = useState<string>()

  const iconLogo = logos.find((l) => l.kind === 'icon') ?? logos.find((l) => l.kind === 'favicon')
  useEffect(() => { if (iconLogo) blobToDataUrl(iconLogo.blob).then(setIconUrl); else setIconUrl(undefined) }, [iconLogo])

  const fg = qrFg || colors[0]?.hex || '#000000'
  const data = qrData || defaultUrl
  useEffect(() => {
    const opts = {
      width: 280, height: 280, data, margin: 8, type: 'canvas' as const,
      image: useIcon ? iconUrl : undefined,
      qrOptions: { errorCorrectionLevel: 'H' as const },
      dotsOptions: { color: fg, type: qrStyle },
      cornersSquareOptions: { color: fg, type: qrStyle === 'square' ? 'square' as const : 'extra-rounded' as const },
      backgroundOptions: { color: qrBg },
      imageOptions: { margin: 6, imageSize: 0.3, crossOrigin: 'anonymous' },
    }
    if (!qrObj.current) {
      qrObj.current = new QRCodeStyling(opts)
      if (qrRef.current) { qrRef.current.innerHTML = ''; qrObj.current.append(qrRef.current) }
    } else qrObj.current.update(opts)
  }, [data, fg, qrBg, qrStyle, useIcon, iconUrl])
  useEffect(() => () => { qrObj.current = null }, [])

  const downloadQr = () => run('qr', async () => {
    const big = new QRCodeStyling({
      width: 1024, height: 1024, data, margin: 24, image: useIcon ? iconUrl : undefined,
      qrOptions: { errorCorrectionLevel: 'H' }, dotsOptions: { color: fg, type: qrStyle }, backgroundOptions: { color: qrBg },
      imageOptions: { margin: 16, imageSize: 0.3, crossOrigin: 'anonymous' },
    })
    const raw = await big.getRawData('png')
    if (raw) await saveBlob(raw as Blob, `qr-${slug(brand!.name)}.png`)
  })

  /* ───── Favicons ───── */
  const favicons = () => run('fav', async () => {
    const src = logos.find((l) => l.kind === 'favicon') ?? logos.find((l) => l.kind === 'icon') ?? logos.find((l) => l.kind === 'main')
    if (!src) throw new Error('Sube un logo (isotipo o favicon) primero')
    const zip = new JSZip()
    for (const s of [16, 32, 192, 512]) zip.file(`favicon-${s}x${s}.png`, await rasterize(src.blob, s))
    zip.file('apple-touch-icon-180x180.png', await rasterize(src.blob, 180, 180, colors[1]?.hex ?? '#FFFFFF'))
    zip.file('manifest-snippet.json', JSON.stringify({
      name: brand!.name, short_name: brand!.name.slice(0, 12),
      icons: [{ src: 'favicon-192x192.png', sizes: '192x192', type: 'image/png' }, { src: 'favicon-512x512.png', sizes: '512x512', type: 'image/png' }],
      theme_color: colors[0]?.hex ?? '#000000', background_color: colors[1]?.hex ?? '#ffffff',
    }, null, 2))
    zip.file('head-snippet.html', `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">\n<link rel="manifest" href="/manifest.json">`)
    await saveBlob(await zip.generateAsync({ type: 'blob' }), `favicons-${slug(brand!.name)}.zip`)
    toast('Paquete de favicons listo')
  })

  /* ───── Backup ───── */
  const backup = (fmt: 'zip' | 'json') => run(`bk-${fmt}`, async () => {
    const { blob } = fmt === 'zip' ? await exportBackupZip(brandId) : await exportBackupJson(brandId)
    await saveBlob(blob, `respaldo-${slug(brand!.name)}.${fmt}`)
    toast('Copia de seguridad creada')
  })
  const restore = (file?: File) => file && run('import', async () => {
    const id = await importBackup(file)
    setBrandId(id)
    setView('dashboard')
    toast('Marca importada correctamente')
  })

  const Spin = ({ k }: { k: string }) => (busy === k ? <Loader2 size={16} className="animate-spin" /> : null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Exportar y herramientas" subtitle="Lleva tu marca a cualquier lugar: manual en PDF, QR, favicons y copias de seguridad." />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card icon={<FileText />} title="Manual de marca (PDF)" desc="Portada, identidad, paleta, tipografías y logos en un documento listo para compartir.">
          <button id="export-pdf" className="btn btn-primary self-start" disabled={!!busy} onClick={pdf}><Spin k="pdf" /><Download size={16} /> Generar PDF</button>
        </Card>

        <Card icon={<ImageIcon />} title="Paquete de favicons e iconos" desc="16×16, 32×32, 192×192 y 512×512 (+ Apple Touch) en un .zip con fragmentos HTML y manifiesto.">
          <button id="export-favicons" className="btn btn-primary self-start" disabled={!!busy} onClick={favicons}><Spin k="fav" /><Download size={16} /> Descargar .zip</button>
        </Card>

        <Card icon={<QrCode />} title="Generador de código QR" desc="Con los colores de tu marca y el isotipo en el centro.">
          <div className="grid sm:grid-cols-[auto_1fr] gap-4">
            <div ref={qrRef} className="rounded-xl overflow-hidden self-start mx-auto border border-slate-200 dark:border-white/10" />
            <div className="grid gap-3 content-start">
              <input id="qr-data" className="input" placeholder={defaultUrl} value={qrData} onChange={(e) => setQrData(e.target.value)} aria-label="Contenido del QR" />
              <div className="flex flex-wrap gap-2 items-center text-xs">Puntos:
                {colors.map((c) => <button key={c.id} aria-label={c.name} onClick={() => setQrFg(c.hex)} className={`w-6 h-6 rounded-full border-2 ${fg === c.hex ? 'border-accent-500' : 'border-transparent'}`} style={{ background: c.hex }} />)}
              </div>
              <div className="flex flex-wrap gap-2 items-center text-xs">Fondo:
                {['#FFFFFF', ...colors.map((c) => c.hex)].map((c, i) => <button key={c + i} aria-label={`Fondo ${c}`} onClick={() => setQrBg(c)} className={`w-6 h-6 rounded-full border-2 ${qrBg === c ? 'border-accent-500' : 'border-slate-300 dark:border-white/20'}`} style={{ background: c }} />)}
              </div>
              <select className="input" value={qrStyle} onChange={(e) => setQrStyle(e.target.value as typeof qrStyle)} aria-label="Estilo">
                <option value="rounded">Redondeado</option><option value="dots">Puntos</option><option value="square">Cuadrado</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useIcon} onChange={(e) => setUseIcon(e.target.checked)} className="accent-violet-500" disabled={!iconUrl} /> Isotipo en el centro</label>
              <button className="btn btn-primary" disabled={!!busy} onClick={downloadQr}><Spin k="qr" /><Download size={16} /> Descargar PNG</button>
            </div>
          </div>
        </Card>

        <Card icon={<Archive />} title="Copia de seguridad" desc="Exporta toda la marca (colores, fuentes, logos, redes y diseños) o impórtala como una marca nueva.">
          <div className="flex flex-wrap gap-2">
            <button id="backup-zip" className="btn btn-primary" disabled={!!busy} onClick={() => backup('zip')}><Spin k="bk-zip" /><Archive size={16} /> Exportar .zip</button>
            <button id="backup-json" className="btn" disabled={!!busy} onClick={() => backup('json')}><Spin k="bk-json" /><FileJson size={16} /> Exportar .json</button>
            <button id="backup-import" className="btn" disabled={!!busy} onClick={() => importRef.current?.click()}><Spin k="import" /><Upload size={16} /> Importar</button>
            <input ref={importRef} type="file" accept=".zip,.json,application/json,application/zip" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = '' }} />
          </div>
        </Card>
      </div>
    </div>
  )
}
