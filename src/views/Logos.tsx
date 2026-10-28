import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Upload, Trash2, Download, X, Ruler, Ban } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db, type BrandLogo, type LogoKind } from '../db/brandDb'
import { PageHeader, Modal, Empty } from '../components/ui'
import { BlobImg } from '../components/BlobImg'
import { saveBlob, slug } from '../lib/files'

export const LOGO_KINDS: { id: LogoKind; label: string }[] = [
  { id: 'main', label: 'Principal' }, { id: 'secondary', label: 'Secundario' }, { id: 'icon', label: 'Isotipo' },
  { id: 'monoLight', label: 'Monocromático claro' }, { id: 'monoDark', label: 'Monocromático oscuro' }, { id: 'favicon', label: 'Favicon' },
]

export default function Logos() {
  const { brand, toast } = useApp()
  const brandId = brand!.id!
  const logos = useLiveQuery(() => db.logos.where('brandId').equals(brandId).toArray(), [brandId], [])
  const colors = useLiveQuery(() => db.colors.where('brandId').equals(brandId).sortBy('order'), [brandId], [])
  const [kind, setKind] = useState<LogoKind>('main')
  const [view, setView] = useState<BrandLogo | null>(null)
  const [bg, setBg] = useState<string>('checker')
  const [guide, setGuide] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast(`${file.name} no es una imagen`, 'error'); continue }
      await db.logos.add({ brandId, kind, name: file.name.replace(/\.[^.]+$/, ''), blob: file, mime: file.type })
    }
    toast('Logo subido')
    if (fileRef.current) fileRef.current.value = ''
  }

  const bgStyle = (b: string): React.CSSProperties => (b === 'checker' ? {} : { background: b })

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Bóveda de logos" subtitle="Sube, clasifica y consulta tus logotipos con guías de uso correcto."
        actions={<>
          <select id="logo-kind" className="input !w-auto" value={kind} onChange={(e) => setKind(e.target.value as LogoKind)} aria-label="Tipo de logo">
            {LOGO_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          <button id="upload-logo" className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Subir logo</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
        </>} />

      {!logos.length && <Empty icon={<Upload size={40} />} text="Sube tu primer logotipo (SVG o PNG recomendado)." />}

      {LOGO_KINDS.map((k) => {
        const list = logos.filter((l) => l.kind === k.id)
        if (!list.length) return null
        return (
          <section key={k.id}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">{k.label}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map((l) => (
                <article key={l.id} className="card overflow-hidden group cursor-pointer animate-fadeUp" onClick={() => { setView(l); setBg('checker'); setGuide(false) }}>
                  <div className="checker h-36 grid place-items-center p-4 transition group-hover:scale-[1.02]"><BlobImg blob={l.blob} className="max-h-full max-w-full" /></div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-sm truncate">{l.name}</span>
                    <button className="btn btn-icon btn-danger opacity-60 hover:opacity-100" aria-label="Eliminar logo"
                      onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar este logo?')) db.logos.delete(l.id!) }}><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.name ?? ''}>
        {view && (
          <div className="flex flex-col gap-4">
            <div className={`relative rounded-xl h-64 grid place-items-center overflow-hidden ${bg === 'checker' ? 'checker' : ''}`} style={bgStyle(bg)}>
              <div className="relative p-[12%] max-h-full" style={guide ? { outline: '2px dashed #f43f5e', outlineOffset: 0, background: 'rgba(244,63,94,.08)' } : {}}>
                {guide && <span className="absolute top-0 left-0 right-0 text-center text-[10px] font-bold text-rose-500" style={{ lineHeight: '24px' }}>x = altura del isotipo</span>}
                <div className="relative outline outline-1 outline-sky-500/60">
                  <BlobImg blob={view.blob} className="max-h-36 max-w-[240px]" />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className={`w-7 h-7 rounded-full checker border-2 ${bg === 'checker' ? 'border-accent-500' : 'border-slate-300'}`} aria-label="Fondo transparente" onClick={() => setBg('checker')} />
              {['#FFFFFF', '#000000', ...colors.map((c) => c.hex)].map((c, i) => (
                <button key={c + i} aria-label={`Fondo ${c}`} className={`w-7 h-7 rounded-full border-2 ${bg === c ? 'border-accent-500 scale-110' : 'border-slate-300 dark:border-white/20'}`} style={{ background: c }} onClick={() => setBg(c)} />
              ))}
            </div>
            <div className="flex gap-2">
              <button className={`btn ${guide ? 'btn-primary' : ''}`} onClick={() => setGuide((g) => !g)}><Ruler size={16} /> Área de seguridad</button>
              <button className="btn" onClick={() => saveBlob(view.blob, `${slug(view.name)}.${view.mime.includes('svg') ? 'svg' : view.mime.split('/')[1] || 'png'}`)}><Download size={16} /> Descargar</button>
            </div>
            {guide && <p className="text-xs text-slate-500">Mantén libre un margen mínimo equivalente a la altura del isotipo alrededor del logo. No coloques textos ni bordes dentro de esta zona.</p>}

            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2"><Ban size={16} className="text-rose-500" /> Usos incorrectos</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['No estirar', { transform: 'scaleX(1.6)' }, ''],
                  ['No rotar', { transform: 'rotate(-20deg)' }, ''],
                  ['No cambiar colores', { filter: 'hue-rotate(140deg) saturate(2)' }, ''],
                  ['No añadir sombras', { filter: 'drop-shadow(4px 6px 3px rgba(0,0,0,.6))' }, ''],
                  ['No bajar contraste', { opacity: 0.35 }, ''],
                  ['No sobre fondos recargados', {}, 'busy'],
                ] as [string, React.CSSProperties, string][]).map(([label, style, extra]) => (
                  <figure key={label} className="relative">
                    <div className={`relative h-20 rounded-lg overflow-hidden grid place-items-center ${extra ? '' : 'checker'}`}
                      style={extra ? { background: 'repeating-linear-gradient(45deg,#f43f5e,#f43f5e 8px,#22d3ee 8px,#22d3ee 16px)' } : {}}>
                      <BlobImg blob={view.blob} className="max-h-12 max-w-[80%]" style={style} />
                      <X className="absolute top-1 right-1 text-rose-500 bg-white rounded-full p-0.5" size={16} />
                    </div>
                    <figcaption className="text-[10px] text-center mt-1 text-slate-500">{label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
