import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Copy, Pencil, Trash2, ExternalLink, Ruler, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { db, type SocialProfile } from '../db/brandDb'
import { PageHeader, Modal, Field, Empty } from '../components/ui'
import { NETWORKS, NetBadge, netById, STATUS_LABELS } from '../lib/networks'
import { copyText } from '../lib/files'

export default function Social() {
  const { brand, toast } = useApp()
  const brandId = brand!.id!
  const list = useLiveQuery(() => db.socials.where('brandId').equals(brandId).toArray(), [brandId], [])
  const [edit, setEdit] = useState<Partial<SocialProfile> | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  const copy = async (t: string) => { await copyText(t); toast('Copiado al portapapeles') }

  const save = async () => {
    if (!edit?.network) return
    const data = {
      brandId, network: edit.network, handle: edit.handle?.trim() ?? '', url: edit.url?.trim() ?? '',
      status: edit.status ?? 'pending', bio: edit.bio ?? '',
    } as SocialProfile
    if (!data.handle) return toast('Indica el usuario', 'error')
    if (edit.id) await db.socials.update(edit.id, data)
    else await db.socials.add(data)
    setEdit(null)
    toast('Red guardada')
  }

  const onHandle = (v: string) => {
    const n = netById(edit?.network ?? 'web')
    const clean = v.replace(/^@/, '')
    setEdit((e) => ({ ...e, handle: v, url: !e?.id || !e.url ? (clean ? n.urlBase + clean : '') : e.url }))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Redes y huella digital" subtitle="Controla tus usuarios, biografías y tamaños de imagen por plataforma."
        actions={<button id="add-social" className="btn btn-primary" onClick={() => setEdit({ network: 'instagram', status: 'pending', handle: '', url: '', bio: '' })}><Plus size={16} /> Añadir red</button>} />

      {!list.length && <Empty icon={<ExternalLink size={40} />} text="Aún no has registrado redes sociales." />}

      <div className="grid gap-4">
        {list.map((s) => {
          const n = netById(s.network)
          const st = STATUS_LABELS[s.status]
          const isOpen = open === s.id
          return (
            <article key={s.id} className="card p-4 animate-fadeUp">
              <div className="flex items-center gap-3">
                <NetBadge id={s.network} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{n.name}</h3>
                    <span className={`chip ${st.cls}`}>{st.label}</span>
                  </div>
                  <button className="text-sm text-slate-500 hover:text-accent-500 flex items-center gap-1" onClick={() => copy(s.handle)}>{s.handle} <Copy size={12} /></button>
                </div>
                <div className="flex gap-1">
                  {s.url && <a className="btn btn-icon" href={s.url} target="_blank" rel="noreferrer" aria-label="Abrir"><ExternalLink size={16} /></a>}
                  <button className="btn btn-icon" aria-label="Editar" onClick={() => setEdit(s)}><Pencil size={16} /></button>
                  <button className="btn btn-icon btn-danger" aria-label="Eliminar" onClick={() => confirm('¿Eliminar esta red?') && db.socials.delete(s.id!)}><Trash2 size={16} /></button>
                </div>
              </div>
              {s.bio && (
                <div className="mt-3 rounded-xl bg-slate-100 dark:bg-white/5 p-3 text-sm whitespace-pre-line relative">
                  {s.bio}
                  <button className="btn btn-icon absolute top-1.5 right-1.5" aria-label="Copiar biografía" onClick={() => copy(s.bio)}><Copy size={14} /></button>
                </div>
              )}
              {n.sizes.length > 0 && (
                <>
                  <button className="mt-3 text-xs text-accent-500 flex items-center gap-1" onClick={() => setOpen(isOpen ? null : s.id!)}>
                    <Ruler size={14} /> Guía de dimensiones <ChevronDown size={14} className={`transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm">
                      {n.sizes.map((z) => <div key={z.label} className="flex justify-between rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-1.5"><span>{z.label}</span><span className="font-mono text-xs">{z.size}</span></div>)}
                    </div>
                  )}
                </>
              )}
            </article>
          )
        })}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar red' : 'Añadir red'}>
        {edit && (
          <div className="flex flex-col gap-4">
            <Field label="Plataforma">
              <select className="input" value={edit.network} onChange={(e) => setEdit({ ...edit, network: e.target.value })}>
                {NETWORKS.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </Field>
            <Field label="Usuario / @handle"><input id="social-handle" className="input" value={edit.handle ?? ''} onChange={(e) => onHandle(e.target.value)} /></Field>
            <Field label="URL"><input className="input" value={edit.url ?? ''} onChange={(e) => setEdit({ ...edit, url: e.target.value })} /></Field>
            <Field label="Estado del nombre de usuario">
              <select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as SocialProfile['status'] })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Biografía"><textarea rows={4} className="input" value={edit.bio ?? ''} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></Field>
            <button id="save-social" className="btn btn-primary" onClick={save}>Guardar</button>
          </div>
        )}
      </Modal>
    </div>
  )
}
