import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Upload, Trash2, Plus, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db, type TypeRole, type TypeStyle } from '../db/brandDb'
import { PageHeader, Modal } from '../components/ui'
import { GOOGLE_FONTS, loadGoogleFont, loadLocalFont, ROLE_LABELS } from '../lib/fonts'

const ROLES: TypeRole[] = ['h1', 'h2', 'h3', 'body', 'button', 'note']
const SAMPLE: Record<TypeRole, string> = {
  h1: 'Un gran título de marca', h2: 'Subtítulo de sección', h3: 'Encabezado menor',
  body: 'El cuerpo de texto debe ser cómodo de leer en pantallas pequeñas y grandes, con un interlineado generoso.',
  button: 'Llamado a la acción', note: 'Nota al pie: texto legal o aclaratorio.',
}
const WEIGHTS = [300, 400, 500, 600, 700, 800]

export default function Typography() {
  const { brand, toast } = useApp()
  const brandId = brand!.id!
  const fonts = useLiveQuery(() => db.fonts.where('brandId').equals(brandId).toArray(), [brandId], [])
  const styles = useLiveQuery(() => db.typeStyles.where('brandId').equals(brandId).toArray(), [brandId], [])
  const [catalog, setCatalog] = useState(false)
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const addGoogle = async (family: string) => {
    if (fonts.some((f) => f.family === family)) return toast('La fuente ya está en la marca', 'error')
    loadGoogleFont(family)
    await db.fonts.add({ brandId, family, source: 'google' })
    toast(`${family} añadida`)
  }

  const onUpload = async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (!/\.(ttf|woff2|woff|otf)$/i.test(file.name)) { toast(`Formato no soportado: ${file.name}`, 'error'); continue }
      const family = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
      try {
        await loadLocalFont(family, file)
        await db.fonts.add({ brandId, family, source: 'local', blob: file, fileName: file.name })
        toast(`Fuente "${family}" guardada`)
      } catch { toast(`No se pudo leer ${file.name}`, 'error') }
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeFont = async (id: number) => { if (confirm('¿Eliminar esta fuente?')) await db.fonts.delete(id) }
  const patch = (s: TypeStyle, p: Partial<TypeStyle>) => db.typeStyles.update(s.id!, p)
  const familyOptions = Array.from(new Set([...fonts.map((f) => f.family), 'Inter']))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Tipografías" subtitle="Elige fuentes de Google o sube las tuyas (.ttf / .woff2) y define la jerarquía visual."
        actions={<>
          <button id="open-catalog" className="btn" onClick={() => setCatalog(true)}><Plus size={16} /> Google Fonts</button>
          <button id="upload-font" className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Subir fuente</button>
          <input ref={fileRef} type="file" accept=".ttf,.woff2,.woff,.otf" multiple hidden onChange={(e) => onUpload(e.target.files)} />
        </>} />

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fonts.map((f) => (
          <article key={f.id} className="card p-4 animate-fadeUp">
            <div className="flex items-start justify-between">
              <span className="chip">{f.source === 'google' ? 'Google Fonts' : 'Archivo local'}</span>
              <button className="btn btn-icon btn-danger" aria-label="Eliminar fuente" onClick={() => removeFont(f.id!)}><Trash2 size={14} /></button>
            </div>
            <div className="text-4xl mt-3 truncate" style={{ fontFamily: `'${f.family}'` }}>Aa</div>
            <div className="font-medium mt-1" style={{ fontFamily: `'${f.family}'` }}>{f.family}</div>
            <div className="text-xs text-slate-500 truncate" style={{ fontFamily: `'${f.family}'` }}>ABCDEFGHIJKLM abcdefghijklm 0123456789</div>
          </article>
        ))}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-4">Escala tipográfica</h2>
        <div className="flex flex-col divide-y divide-slate-200 dark:divide-white/10">
          {ROLES.map((role) => {
            const s = styles.find((x) => x.role === role)
            if (!s) return null
            return (
              <div key={role} className="py-4 grid lg:grid-cols-[320px_1fr] gap-4 items-center">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 text-xs font-bold uppercase tracking-wider text-accent-500">{ROLE_LABELS[role]}</div>
                  <select className="input col-span-2" aria-label="Fuente" value={s.family} onChange={(e) => patch(s, { family: e.target.value })}>
                    {familyOptions.map((f) => <option key={f}>{f}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <input className="input" type="number" min={6} step={s.unit === 'rem' ? 0.125 : 1} aria-label="Tamaño" value={s.size} onChange={(e) => patch(s, { size: Number(e.target.value) })} />
                    <select className="input !w-20" aria-label="Unidad" value={s.unit} onChange={(e) => {
                      const unit = e.target.value as 'px' | 'rem'
                      patch(s, { unit, size: unit === 'rem' ? +(s.size / 16).toFixed(3) : Math.round(s.size * 16) })
                    }}><option>px</option><option>rem</option></select>
                  </div>
                  <select className="input" aria-label="Peso" value={s.weight} onChange={(e) => patch(s, { weight: Number(e.target.value) })}>
                    {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <label className="col-span-2 flex items-center gap-2 text-xs text-slate-500">Interlineado
                    <input type="range" min={0.9} max={2} step={0.05} className="flex-1 accent-violet-500" value={s.lineHeight} onChange={(e) => patch(s, { lineHeight: Number(e.target.value) })} />
                    <span className="w-8 text-right font-mono">{s.lineHeight}</span>
                  </label>
                </div>
                <div
                  contentEditable suppressContentEditableWarning spellCheck={false}
                  className="outline-none rounded-xl p-3 border border-dashed border-slate-300 dark:border-white/15 focus:border-accent-500 overflow-hidden"
                  style={{ fontFamily: `'${s.family}'`, fontSize: `${s.size}${s.unit}`, fontWeight: s.weight, lineHeight: s.lineHeight }}
                >{SAMPLE[role]}</div>
              </div>
            )
          })}
        </div>
      </section>

      <Modal open={catalog} onClose={() => setCatalog(false)} title="Catálogo de Google Fonts">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Buscar fuente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p className="text-xs text-slate-500 mb-2">Requiere conexión la primera vez; luego queda en caché.</p>
        <div className="grid gap-1 max-h-[50vh] overflow-auto">
          {catalog && GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q.toLowerCase())).map((f) => {
            loadGoogleFont(f)
            const has = fonts.some((x) => x.family === f)
            return (
              <button key={f} disabled={has} onClick={() => addGoogle(f)} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 text-left">
                <span className="text-xl" style={{ fontFamily: `'${f}'` }}>{f}</span>
                <span className="text-xs text-accent-500">{has ? 'Añadida' : 'Añadir'}</span>
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
