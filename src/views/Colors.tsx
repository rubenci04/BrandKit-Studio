import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Copy, Pencil, Trash2, Palette, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db, type BrandColor, type ColorCategory } from '../db/brandDb'
import { PageHeader, Modal, Field, Empty } from '../components/ui'
import { colorFormats, contrastRatio, wcagLevel, normalizeHex, readableOn, fetchColorName, type WcagLevel } from '../lib/color'
import { copyText } from '../lib/files'

const CATS: { id: ColorCategory; label: string }[] = [
  { id: 'primary', label: 'Primarios' }, { id: 'secondary', label: 'Secundarios' }, { id: 'accent', label: 'Acento' },
  { id: 'neutral', label: 'Neutros' }, { id: 'semantic', label: 'Semánticos' },
]

const LEVEL_CLS: Record<WcagLevel, string> = {
  AAA: 'bg-emerald-500 text-white', AA: 'bg-lime-500 text-black', 'AA Large': 'bg-amber-400 text-black', Fallo: 'bg-rose-500 text-white',
}

export default function Colors() {
  const { brand, toast } = useApp()
  const brandId = brand!.id!
  const colors = useLiveQuery(() => db.colors.where('brandId').equals(brandId).sortBy('order'), [brandId], [])
  const [edit, setEdit] = useState<Partial<BrandColor> | null>(null)
  const [sel, setSel] = useState<{ bg: BrandColor; fg: BrandColor } | null>(null)
  const [busyName, setBusyName] = useState(false)

  const copy = async (text: string) => { await copyText(text); toast('Copiado al portapapeles') }

  const save = async () => {
    if (!edit) return
    const hex = normalizeHex(edit.hex ?? '')
    if (!hex) return toast('Código HEX inválido', 'error')
    if (!edit.name?.trim()) return toast('Escribe un nombre', 'error')
    if (edit.id) await db.colors.update(edit.id, { name: edit.name.trim(), hex, category: edit.category! })
    else await db.colors.add({ brandId, name: edit.name.trim(), hex, category: edit.category ?? 'primary', order: Date.now() })
    setEdit(null)
    toast('Color guardado')
  }

  const suggestName = async () => {
    const hex = normalizeHex(edit?.hex ?? '')
    if (!hex) return
    setBusyName(true)
    const n = await fetchColorName(hex)
    setBusyName(false)
    if (n) setEdit((e) => ({ ...e, name: n }))
    else toast('No se pudo consultar TheColorAPI (¿sin conexión?)', 'error')
  }

  const matrix = useMemo(() => colors, [colors])
  const editHex = normalizeHex(edit?.hex ?? '') ?? '#000000'

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Colores" subtitle="Organiza tu paleta, copia cada formato con un toque y valida la accesibilidad WCAG 2.1."
        actions={<button id="add-color" className="btn btn-primary" onClick={() => setEdit({ hex: '#7C3AED', name: '', category: 'primary' })}><Plus size={16} /> Nuevo color</button>} />

      {!colors.length && <Empty icon={<Palette size={40} />} text="Esta marca aún no tiene colores." />}

      {CATS.map((cat) => {
        const list = colors.filter((c) => c.category === cat.id)
        if (!list.length) return null
        return (
          <section key={cat.id}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">{cat.label}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((c) => {
                const f = colorFormats(c.hex)
                return (
                  <article key={c.id} className="card overflow-hidden group animate-fadeUp">
                    <div className="h-24 p-3 flex items-start justify-between" style={{ background: c.hex, color: readableOn(c.hex) }}>
                      <span className="font-semibold drop-shadow-sm">{c.name}</span>
                      <span className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition max-sm:opacity-100">
                        <button className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30" aria-label="Editar" onClick={() => setEdit(c)}><Pencil size={14} /></button>
                        <button className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30" aria-label="Eliminar" onClick={() => confirm('¿Eliminar este color?') && db.colors.delete(c.id!)}><Trash2 size={14} /></button>
                      </span>
                    </div>
                    <div className="p-3 grid gap-1">
                      {Object.entries(f).map(([k, v]) => (
                        <button key={k} onClick={() => copy(v)} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-left hover:bg-slate-100 dark:hover:bg-white/10 transition" title="Copiar">
                          <span className="text-[10px] font-bold text-slate-400 w-10">{k}</span>
                          <span className="font-mono text-xs flex-1 truncate">{v}</span>
                          <Copy size={12} className="text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* Laboratorio de contraste */}
      {matrix.length > 1 && (
        <section className="card p-5">
          <h2 className="font-semibold flex items-center gap-2"><Sparkles size={18} className="text-accent-500" /> Laboratorio de contraste WCAG</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">Filas = color de fondo · Columnas = color de texto. Toca una celda para previsualizar.</p>
          <div className="flex flex-wrap gap-3 text-xs mb-4">
            {(['AAA', 'AA', 'AA Large', 'Fallo'] as WcagLevel[]).map((l) => (
              <span key={l} className={`px-2 py-0.5 rounded-full font-semibold ${LEVEL_CLS[l]}`}>
                {l === 'AA Large' ? 'AA texto grande (≥3)' : l === 'AAA' ? 'AAA (≥7)' : l === 'AA' ? 'AA (≥4.5)' : 'Fallo (<3)'}
              </span>
            ))}
          </div>
          <div className="overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="text-xs border-collapse min-w-full" id="contrast-matrix">
              <thead>
                <tr>
                  <th className="p-2 sticky left-0 bg-white dark:bg-ink-800 z-10">Fondo ↓ / Texto →</th>
                  {matrix.map((fg) => (
                    <th key={fg.id} className="p-1.5 min-w-[64px]">
                      <div className="w-6 h-6 rounded-full mx-auto border border-black/10" style={{ background: fg.hex }} title={fg.name} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((bg) => (
                  <tr key={bg.id}>
                    <th className="p-2 text-left sticky left-0 bg-white dark:bg-ink-800 z-10 whitespace-nowrap font-medium">
                      <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle border border-black/10" style={{ background: bg.hex }} />{bg.name}
                    </th>
                    {matrix.map((fg) => {
                      if (fg.id === bg.id) return <td key={fg.id} className="text-center text-slate-300">—</td>
                      const r = contrastRatio(bg.hex, fg.hex)
                      const lvl = wcagLevel(r)
                      return (
                        <td key={fg.id} className="p-0.5">
                          <button onClick={() => setSel({ bg, fg })} className="w-full rounded-md py-1.5 px-1 font-semibold hover:ring-2 ring-accent-500 transition"
                            style={{ background: bg.hex, color: fg.hex }}>
                            <div>Aa</div>
                            <div className={`text-[9px] mt-0.5 rounded px-1 ${LEVEL_CLS[lvl]}`}>{r.toFixed(1)} {lvl === 'AA Large' ? 'AA+' : lvl}</div>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title="Vista previa de contraste">
        {sel && (() => {
          const r = contrastRatio(sel.bg.hex, sel.fg.hex)
          const lvl = wcagLevel(r)
          return (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl p-6" style={{ background: sel.bg.hex, color: sel.fg.hex }}>
                <div className="text-3xl font-bold">Título grande</div>
                <p className="mt-2">Este es un párrafo de texto normal para comprobar la legibilidad.</p>
              </div>
              <div className="flex items-center justify-between">
                <div><div className="text-3xl font-bold">{r.toFixed(2)}:1</div><div className="text-xs text-slate-500">{sel.fg.name} sobre {sel.bg.name}</div></div>
                <span className={`px-3 py-1 rounded-full font-bold ${LEVEL_CLS[lvl]}`}>{lvl}</span>
              </div>
              <ul className="text-sm grid gap-1">
                {[['Texto normal AA', 4.5], ['Texto normal AAA', 7], ['Texto grande AA', 3], ['Texto grande AAA', 4.5]].map(([k, min]) => (
                  <li key={k} className="flex justify-between"><span>{k}</span><span className={r >= (min as number) ? 'text-emerald-500' : 'text-rose-500'}>{r >= (min as number) ? '✓ Cumple' : '✗ No cumple'}</span></li>
                ))}
              </ul>
            </div>
          )
        })()}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar color' : 'Nuevo color'}>
        {edit && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-end">
              <input type="color" aria-label="Selector de color" className="w-14 h-14 rounded-xl border-0 bg-transparent cursor-pointer" value={editHex} onChange={(e) => setEdit({ ...edit, hex: e.target.value.toUpperCase() })} />
              <div className="flex-1"><Field label="HEX"><input id="color-hex" className="input font-mono" value={edit.hex ?? ''} onChange={(e) => setEdit({ ...edit, hex: e.target.value })} /></Field></div>
            </div>
            <Field label="Nombre">
              <div className="flex gap-2">
                <input id="color-name" className="input" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                <button className="btn shrink-0" onClick={suggestName} disabled={busyName} title="Sugerir nombre con TheColorAPI (online)">{busyName ? '…' : 'Sugerir'}</button>
              </div>
            </Field>
            <Field label="Categoría">
              <select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as ColorCategory })}>
                {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-1 text-xs font-mono text-slate-500">
              {Object.entries(colorFormats(editHex)).map(([k, v]) => <div key={k}>{k}: {v}</div>)}
            </div>
            <button id="save-color" className="btn btn-primary" onClick={save}>Guardar</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
