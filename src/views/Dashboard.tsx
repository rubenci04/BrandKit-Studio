import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Check, Trash2, ExternalLink } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db, deleteBrand, type Brand } from '../db/brandDb'
import { PageHeader, Field } from '../components/ui'
import { BlobImg } from '../components/BlobImg'
import { NetBadge, netById } from '../lib/networks'
import { readableOn } from '../lib/color'

export default function Dashboard() {
  const { brand, brands, setBrandId, setView, toast } = useApp()
  const b = brand!
  const id = b.id!
  const colors = useLiveQuery(() => db.colors.where('brandId').equals(id).sortBy('order'), [id], [])
  const fonts = useLiveQuery(() => db.fonts.where('brandId').equals(id).toArray(), [id], [])
  const logos = useLiveQuery(() => db.logos.where('brandId').equals(id).toArray(), [id], [])
  const socials = useLiveQuery(() => db.socials.where('brandId').equals(id).toArray(), [id], [])
  const typeStyles = useLiveQuery(() => db.typeStyles.where('brandId').equals(id).toArray(), [id], [])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Brand>(b)
  useEffect(() => setDraft(b), [b])

  const save = async () => {
    await db.brands.update(id, { name: draft.name.trim() || b.name, tagline: draft.tagline, mission: draft.mission, vision: draft.vision, voice: draft.voice })
    setEditing(false)
    toast('Identidad guardada')
  }
  const remove = async () => {
    if (!confirm(`¿Eliminar la marca "${b.name}" y todos sus datos? Esta acción no se puede deshacer.`)) return
    await deleteBrand(id)
    const rest = brands.filter((x) => x.id !== id)
    if (rest[0]) setBrandId(rest[0].id!)
    toast('Marca eliminada')
  }

  const mainLogo = logos.find((l) => l.kind === 'main')
  const darkLogo = logos.find((l) => l.kind === 'secondary')
  const icon = logos.find((l) => l.kind === 'icon')
  const h1 = typeStyles.find((s) => s.role === 'h1')
  const body = typeStyles.find((s) => s.role === 'body')
  const primary = colors[0]?.hex ?? '#7c3aed'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={b.name}
        subtitle={b.tagline || 'Define el eslogan de tu marca'}
        actions={
          editing ? (
            <button className="btn btn-primary" onClick={save}><Check size={16} /> Guardar</button>
          ) : (
            <>
              <button id="edit-identity" className="btn" onClick={() => setEditing(true)}><Pencil size={16} /> Editar identidad</button>
              <button className="btn btn-danger" onClick={remove} aria-label="Eliminar marca"><Trash2 size={16} /></button>
            </>
          )
        }
      />

      {/* Hero */}
      <section className="rounded-3xl overflow-hidden grid md:grid-cols-2 border border-slate-200 dark:border-white/10 animate-fadeUp">
        <div className="p-8 flex items-center justify-center min-h-[200px]" style={{ background: colors[1]?.hex ?? '#f1f5f9' }}>
          {mainLogo ? <BlobImg blob={mainLogo.blob} className="max-h-32 w-auto max-w-full" /> : <span className="text-slate-400">Sin logo principal</span>}
        </div>
        <div className="p-8 flex items-center justify-center min-h-[200px]" style={{ background: primary }}>
          {darkLogo || mainLogo ? <BlobImg blob={(darkLogo ?? mainLogo)!.blob} className="max-h-32 w-auto max-w-full" /> : null}
        </div>
      </section>

      {/* Identidad */}
      <section className="card p-5 grid md:grid-cols-2 gap-5">
        {editing ? (
          <>
            <Field label="Nombre"><input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Eslogan"><input className="input" value={draft.tagline} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} /></Field>
            <Field label="Misión"><textarea rows={3} className="input" value={draft.mission} onChange={(e) => setDraft({ ...draft, mission: e.target.value })} /></Field>
            <Field label="Visión"><textarea rows={3} className="input" value={draft.vision} onChange={(e) => setDraft({ ...draft, vision: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Tono de voz"><textarea rows={3} className="input" value={draft.voice} onChange={(e) => setDraft({ ...draft, voice: e.target.value })} /></Field></div>
          </>
        ) : (
          <>
            {([['Misión', b.mission], ['Visión', b.vision], ['Tono de voz', b.voice]] as const).map(([k, v]) => (
              <div key={k} className={k === 'Tono de voz' ? 'md:col-span-2' : ''}>
                <div className="label">{k}</div>
                <p className="text-sm leading-relaxed">{v || <span className="text-slate-400">Sin definir</span>}</p>
              </div>
            ))}
          </>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Paleta */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Paleta</h2>
            <button className="text-xs text-accent-500 hover:underline" onClick={() => setView('colors')}>Ver todo</button>
          </div>
          {colors.length ? (
            <div className="flex rounded-xl overflow-hidden h-20">
              {colors.map((c) => (
                <div key={c.id} title={`${c.name} ${c.hex}`} className="flex-1 flex items-end p-1 text-[9px] font-mono transition-all hover:flex-[2]"
                  style={{ background: c.hex, color: readableOn(c.hex) }}>
                  <span className="hidden sm:block truncate">{c.hex.slice(1)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-400">Aún no hay colores.</p>}
        </section>

        {/* Tipografías */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Tipografías</h2>
            <button className="text-xs text-accent-500 hover:underline" onClick={() => setView('typography')}>Gestionar</button>
          </div>
          <div style={{ fontFamily: `'${h1?.family ?? 'Inter'}'`, fontWeight: h1?.weight ?? 700 }} className="text-3xl leading-tight">{b.name}</div>
          <p style={{ fontFamily: `'${body?.family ?? 'Inter'}'` }} className="text-sm text-slate-500 dark:text-slate-400 mt-1">{b.tagline || 'Texto de ejemplo con la tipografía de cuerpo.'}</p>
          <div className="flex flex-wrap gap-2 mt-3">{fonts.map((f) => <span key={f.id} className="chip" style={{ fontFamily: `'${f.family}'` }}>{f.family}</span>)}</div>
        </section>

        {/* Logos */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Logos</h2>
            <button className="text-xs text-accent-500 hover:underline" onClick={() => setView('logos')}>Abrir bóveda</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {logos.slice(0, 6).map((l) => (
              <div key={l.id} className="checker w-24 h-24 shrink-0 rounded-xl grid place-items-center p-2 border border-slate-200 dark:border-white/10">
                <BlobImg blob={l.blob} className="max-w-full max-h-full" />
              </div>
            ))}
            {!logos.length && <p className="text-sm text-slate-400">Aún no hay logos.</p>}
            {icon && null}
          </div>
        </section>

        {/* Redes */}
        <section className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Redes sociales</h2>
            <button className="text-xs text-accent-500 hover:underline" onClick={() => setView('social')}>Directorio</button>
          </div>
          <div className="flex flex-col gap-2">
            {socials.slice(0, 5).map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-white/5">
                <NetBadge id={s.network} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.handle}</div>
                  <div className="text-xs text-slate-500">{netById(s.network).name}</div>
                </div>
                <ExternalLink size={14} className="text-slate-400" />
              </a>
            ))}
            {!socials.length && <p className="text-sm text-slate-400">Aún no hay redes registradas.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
