import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Canvas, FabricImage, Textbox, Gradient, FabricObject } from 'fabric'
import { Type, ImagePlus, Eraser, Trash2, Download, Save, ArrowUp, ArrowDown, Shapes, Loader2, Image as ImageIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db } from '../db/brandDb'
import { PageHeader } from '../components/ui'
import { BlobImg } from '../components/BlobImg'
import { dataUrlToBlob, saveBlob, slug } from '../lib/files'
import { readableOn } from '../lib/color'
import { registerBrandFonts } from '../lib/fonts'

const TEMPLATES = [
  { id: 'post', name: 'Post 1:1', w: 1080, h: 1080 },
  { id: 'story', name: 'Historia / Reel', w: 1080, h: 1920 },
  { id: 'linkedin', name: 'Banner LinkedIn', w: 1584, h: 396 },
  { id: 'youtube', name: 'Banner YouTube', w: 2560, h: 1440 },
  { id: 'feed45', name: 'Retrato 4:5', w: 1080, h: 1350 },
  { id: 'wide', name: 'Horizontal 16:9', w: 1920, h: 1080 },
]

type Tagged = FabricObject & { _blob?: Blob }

export default function Studio() {
  const { brand, toast, studioPreset, clearStudioPreset } = useApp()
  const brandId = brand!.id!
  const colors = useLiveQuery(() => db.colors.where('brandId').equals(brandId).sortBy('order'), [brandId], [])
  const logos = useLiveQuery(() => db.logos.where('brandId').equals(brandId).toArray(), [brandId], [])
  const fonts = useLiveQuery(() => db.fonts.where('brandId').equals(brandId).toArray(), [brandId], [])
  const styles = useLiveQuery(() => db.typeStyles.where('brandId').equals(brandId).toArray(), [brandId], [])
  const assets = useLiveQuery(() => db.assets.where('brandId').equals(brandId).reverse().sortBy('createdAt'), [brandId], [])

  const elRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fcRef = useRef<Canvas | null>(null)
  const sizeRef = useRef({ w: 1080, h: 1080 })
  const fileRef = useRef<HTMLInputElement>(null)

  const [tpl, setTpl] = useState('post')
  const [selected, setSelected] = useState<FabricObject | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [grad, setGrad] = useState<[string, string]>(['#7C3AED', '#06B6D4'])
  const [mult, setMult] = useState(1)
  const [fontsReady, setFontsReady] = useState(false)

  const updateScale = useCallback(() => {
    const fc = fcRef.current, wrap = wrapRef.current
    if (!fc || !wrap) return
    const { w, h } = sizeRef.current
    const scale = Math.min(wrap.clientWidth / w, 560 / h)
    if (!isFinite(scale) || scale <= 0) return
    fc.setZoom(scale)
    fc.setDimensions({ width: w * scale, height: h * scale })
    fc.requestRenderAll()
  }, [])

  // Crear / destruir el lienzo
  useEffect(() => {
    const fc = new Canvas(elRef.current!, { width: 540, height: 540, backgroundColor: '#ffffff', preserveObjectStacking: true })
    fcRef.current = fc
    const sync = () => setSelected(fc.getActiveObject() ?? null)
    fc.on('selection:created', sync)
    fc.on('selection:updated', sync)
    fc.on('selection:cleared', sync)
    const ro = new ResizeObserver(updateScale)
    ro.observe(wrapRef.current!)
    updateScale()
    return () => {
      ro.disconnect()
      fcRef.current = null
      void fc.dispose()
    }
  }, [updateScale])

  // Fuentes de la marca cargadas
  useEffect(() => { registerBrandFonts(brandId).then(() => setFontsReady(true)) }, [brandId])

  const render = () => fcRef.current?.requestRenderAll()

  const addImage = async (blob: Blob, opts: { fit?: number; center?: boolean } = {}) => {
    const fc = fcRef.current!
    const url = URL.createObjectURL(blob)
    const img = (await FabricImage.fromURL(url)) as FabricImage & Tagged
    img._blob = blob
    const { w, h } = sizeRef.current
    const fit = opts.fit ?? 0.5
    const s = Math.min((w * fit) / (img.width || 1), (h * fit) / (img.height || 1))
    img.scale(s)
    img.set({ left: (w - (img.width || 0) * s) / 2, top: (h - (img.height || 0) * s) / 2 })
    fc.add(img)
    fc.setActiveObject(img)
    render()
    return img
  }

  const addText = async (family?: string, text = 'Tu mensaje aquí') => {
    const fc = fcRef.current!
    const h1 = styles.find((s) => s.role === 'h1')
    const fam = family ?? h1?.family ?? 'Inter'
    try { await document.fonts.load(`700 40px "${fam}"`) } catch { /* sin conexión */ }
    const { w, h } = sizeRef.current
    const bg = typeof fc.backgroundColor === 'string' ? fc.backgroundColor : '#ffffff'
    const t = new Textbox(text, {
      left: w * 0.1, top: h * 0.4, width: w * 0.8, fontSize: Math.round(Math.min(w, h) * 0.09), fontFamily: fam,
      fontWeight: h1?.weight ?? 700, fill: readableOn(bg), textAlign: 'center',
    })
    fc.add(t)
    fc.setActiveObject(t)
    render()
  }

  const setBgColor = (c: string) => {
    const fc = fcRef.current!
    fc.backgroundImage = undefined
    fc.backgroundColor = c
    render()
  }
  const setBgGradient = () => {
    const fc = fcRef.current!
    const { w, h } = sizeRef.current
    fc.backgroundImage = undefined
    fc.backgroundColor = new Gradient({
      type: 'linear', coords: { x1: 0, y1: 0, x2: w, y2: h },
      colorStops: [{ offset: 0, color: grad[0] }, { offset: 1, color: grad[1] }],
    })
    render()
  }
  const setBgImage = async (file: File) => {
    const fc = fcRef.current!
    const { w, h } = sizeRef.current
    const img = await FabricImage.fromURL(URL.createObjectURL(file))
    const s = Math.max(w / (img.width || 1), h / (img.height || 1))
    img.scale(s)
    img.set({ left: (w - (img.width || 0) * s) / 2, top: (h - (img.height || 0) * s) / 2 })
    fc.backgroundImage = img
    render()
  }

  const applyTemplate = async (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!
    setTpl(id)
    sizeRef.current = { w: t.w, h: t.h }
    const fc = fcRef.current!
    fc.discardActiveObject()
    fc.remove(...fc.getObjects())
    const primary = colors[0]?.hex ?? '#7C3AED'
    fc.backgroundImage = undefined
    fc.backgroundColor = primary
    updateScale()
    const tagline = brand?.tagline || brand?.name || 'Tu mensaje'
    await addText(undefined, tagline)
    const txt = fc.getObjects()[0]
    txt?.set({ top: t.h * 0.3, fill: readableOn(primary) })
    const logo = logos.find((l) => l.kind === 'secondary') ?? logos.find((l) => l.kind === 'main')
    if (logo) {
      const img = await addImage(logo.blob, { fit: t.h > t.w ? 0.4 : 0.3 })
      img.set({ top: t.h - (img.height || 0) * (img.scaleY || 1) - t.h * 0.08 })
    }
    fc.discardActiveObject()
    render()
  }

  // Plantilla inicial cuando los datos cargan
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !fontsReady || !colors.length || !styles.length) return
    started.current = true
    const initial = studioPreset && TEMPLATES.some((t) => t.id === studioPreset) ? studioPreset : 'post'
    clearStudioPreset()
    applyTemplate(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady, colors.length, styles.length])

  const removeBg = async () => {
    const obj = selected as (FabricImage & Tagged) | null
    if (!obj || !(obj instanceof FabricImage)) return toast('Selecciona primero una imagen o logo', 'error')
    setBusy('Preparando IA… (la primera vez descarga el modelo)')
    try {
      const src = obj._blob ?? (await dataUrlToBlob(obj.toDataURL({ format: 'png' })))
      const { removeBackground } = await import('@imgly/background-removal')
      const out = await removeBackground(src, {
        progress: (key: string, cur: number, total: number) => setBusy(`Procesando ${key.split(':').pop()} ${Math.round((cur / (total || 1)) * 100)}%`),
      })
      const url = URL.createObjectURL(out)
      await obj.setSrc(url)
      obj._blob = out
      render()
      toast('Fondo eliminado ✨')
    } catch (e) {
      console.error(e)
      toast('No se pudo quitar el fondo. La primera vez requiere conexión para descargar el modelo.', 'error')
    } finally { setBusy(null) }
  }

  const exportPng = async () => {
    const fc = fcRef.current!
    fc.discardActiveObject()
    render()
    const scale = fc.getZoom()
    const data = fc.toDataURL({ format: 'png', multiplier: mult / scale })
    return dataUrlToBlob(data)
  }
  const download = async () => saveBlob(await exportPng(), `${slug(brand!.name)}-${tpl}@${mult}x.png`)
  const saveAsset = async () => {
    await db.assets.add({ brandId, name: `${TEMPLATES.find((t) => t.id === tpl)?.name} · ${new Date().toLocaleString('es')}`, blob: await exportPng(), mime: 'image/png', createdAt: Date.now() })
    toast('Diseño guardado en la marca')
  }

  const del = () => {
    const fc = fcRef.current!
    fc.getActiveObjects().forEach((o) => fc.remove(o))
    fc.discardActiveObject()
    render()
  }
  const layer = (dir: 1 | -1) => {
    const fc = fcRef.current!, o = fc.getActiveObject()
    if (!o) return
    if (dir > 0) fc.bringObjectForward(o); else fc.sendObjectBackwards(o)
    render()
  }

  const textSel = selected instanceof Textbox ? selected : null
  const patchText = async (p: Record<string, unknown>) => {
    if (!textSel) return
    if (typeof p.fontFamily === 'string') { try { await document.fonts.load(`${textSel.fontWeight} 40px "${p.fontFamily}"`) } catch { /* noop */ } }
    textSel.set(p)
    render()
    setSelected(fcRef.current!.getActiveObject() ?? null)
  }
  const tint = (c: string) => (textSel ? patchText({ fill: c }) : null)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Estudio creativo" subtitle="Diseña piezas con los colores, logos y fuentes de tu marca. La IA que quita fondos corre en tu dispositivo." />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TEMPLATES.map((t) => (
          <button key={t.id} id={`tpl-${t.id}`} className={`btn shrink-0 ${tpl === t.id ? 'btn-primary' : ''}`} onClick={() => applyTemplate(t.id)}>
            <Shapes size={14} /> {t.name} <span className="text-[10px] opacity-70">{t.w}×{t.h}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="card p-3 relative">
          <div ref={wrapRef} className="w-full flex justify-center bg-[repeating-conic-gradient(#e4e4e7_0%_25%,#f4f4f5_0%_50%)] dark:bg-[repeating-conic-gradient(#1c1c2b_0%_25%,#232336_0%_50%)] bg-[length:20px_20px] rounded-xl p-2 overflow-hidden">
            <div className="shadow-2xl"><canvas ref={elRef} /></div>
          </div>
          {busy && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-sm grid place-items-center z-10">
              <div className="flex items-center gap-3 text-white"><Loader2 className="animate-spin" /> {busy}</div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-4 grid gap-3">
            <h3 className="font-semibold text-sm">Añadir</h3>
            <div className="grid grid-cols-2 gap-2">
              <button id="add-text" className="btn" onClick={() => addText()}><Type size={16} /> Texto</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Imagen</button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) await addImage(f); e.target.value = '' }} />
            </div>
            {logos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {logos.map((l) => (
                  <button key={l.id} title={l.name} className="checker w-14 h-14 shrink-0 rounded-lg grid place-items-center p-1 border border-slate-200 dark:border-white/10 hover:ring-2 ring-accent-500" onClick={() => addImage(l.blob, { fit: 0.35 })}>
                    <BlobImg blob={l.blob} className="max-w-full max-h-full" />
                  </button>
                ))}
              </div>
            )}
            <button id="remove-bg" className="btn btn-primary" onClick={removeBg} disabled={!(selected instanceof FabricImage)}><Eraser size={16} /> Quitar fondo (IA)</button>
          </div>

          <div className="card p-4 grid gap-3">
            <h3 className="font-semibold text-sm">Fondo</h3>
            <div className="flex flex-wrap gap-1.5">
              {['#FFFFFF', '#000000', ...colors.map((c) => c.hex)].map((c, i) => (
                <button key={c + i} aria-label={`Fondo ${c}`} className="w-7 h-7 rounded-full border border-slate-300 dark:border-white/20 hover:scale-110 transition" style={{ background: c }} onClick={() => setBgColor(c)} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="color" aria-label="Degradado inicio" value={grad[0]} onChange={(e) => setGrad([e.target.value, grad[1]])} className="w-9 h-9 rounded bg-transparent" />
              <input type="color" aria-label="Degradado fin" value={grad[1]} onChange={(e) => setGrad([grad[0], e.target.value])} className="w-9 h-9 rounded bg-transparent" />
              <button className="btn flex-1" onClick={setBgGradient}>Degradado</button>
              <label className="btn cursor-pointer" aria-label="Imagen de fondo"><ImageIcon size={16} />
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setBgImage(f); e.target.value = '' }} />
              </label>
            </div>
          </div>

          {textSel && (
            <div className="card p-4 grid gap-3">
              <h3 className="font-semibold text-sm">Texto seleccionado</h3>
              <select className="input" value={String(textSel.fontFamily)} onChange={(e) => patchText({ fontFamily: e.target.value })}>
                {Array.from(new Set([...fonts.map((f) => f.family), 'Inter'])).map((f) => <option key={f}>{f}</option>)}
              </select>
              <div className="flex gap-2 items-center">
                <input type="range" min={16} max={300} className="flex-1 accent-violet-500" value={Number(textSel.fontSize)} onChange={(e) => patchText({ fontSize: Number(e.target.value) })} />
                <select className="input !w-20" value={Number(textSel.fontWeight)} onChange={(e) => patchText({ fontWeight: Number(e.target.value) })}>
                  {[300, 400, 500, 600, 700, 800].map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['#FFFFFF', '#000000', ...colors.map((c) => c.hex)].map((c, i) => (
                  <button key={c + i} aria-label={`Color de texto ${c}`} className="w-6 h-6 rounded-full border border-slate-300 dark:border-white/20" style={{ background: c }} onClick={() => tint(c)} />
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <button className="btn" onClick={() => layer(1)} disabled={!selected} aria-label="Subir capa"><ArrowUp size={16} /></button>
              <button className="btn" onClick={() => layer(-1)} disabled={!selected} aria-label="Bajar capa"><ArrowDown size={16} /></button>
              <button className="btn btn-danger" onClick={del} disabled={!selected} aria-label="Eliminar capa"><Trash2 size={16} /></button>
            </div>
            <div className="flex items-center gap-2 text-sm">Resolución
              <select className="input !w-auto ml-auto" value={mult} onChange={(e) => setMult(Number(e.target.value))}>
                <option value={1}>1× (estándar)</option><option value={2}>2× (alta)</option><option value={3}>3× (máxima)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button id="download-design" className="btn btn-primary" onClick={download}><Download size={16} /> PNG</button>
              <button className="btn" onClick={saveAsset}><Save size={16} /> Guardar</button>
            </div>
          </div>
        </aside>
      </div>

      {assets.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Diseños guardados</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {assets.map((a) => (
              <article key={a.id} className="card overflow-hidden">
                <div className="checker h-40 grid place-items-center"><BlobImg blob={a.blob} className="max-h-full max-w-full" /></div>
                <div className="p-2 flex items-center justify-between gap-1">
                  <span className="text-xs truncate">{a.name}</span>
                  <span className="flex">
                    <button className="btn btn-icon" aria-label="Descargar" onClick={() => saveBlob(a.blob, `${slug(a.name)}.png`)}><Download size={14} /></button>
                    <button className="btn btn-icon btn-danger" aria-label="Eliminar" onClick={() => db.assets.delete(a.id!)}><Trash2 size={14} /></button>
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
