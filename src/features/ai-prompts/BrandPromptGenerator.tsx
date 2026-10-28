import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  MessageSquare, Bot, Sparkles, Image as ImageIcon, Compass, Dna, Copy, Save, Share2, Wand2, X, Plus, Star, Trash2,
  RotateCcw, Loader2, KeyRound, CheckSquare, Square, ShieldAlert,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { db } from '../../db/brandDb'
import { PageHeader, Field } from '../../components/ui'
import { copyText, shareText } from '../../lib/files'
import {
  ARCHETYPES, LOGO_POSITIONS, PIECE_TYPES, PLATFORMS, RATIOS, STYLE_OPTIONS, SUGGESTED_BAN, SUGGESTED_MUST,
  compilePrompt, defaultConfig, type PieceConfig, type PlatformId, type SectionId,
} from '../../utils/promptCompiler'
import { enrichWithGemini, getGeminiKey, getGeminiModel, setGeminiKey, setGeminiModel } from '../../utils/geminiEnrich'

const ICONS: Record<PlatformId, typeof Bot> = {
  'chatgpt-canva': MessageSquare, 'claude-canva': Bot, 'gemini-imagen': Sparkles,
  'ideogram-flujo': ImageIcon, midjourney: Compass, 'system-context': Dna,
}
const SECTION_COLOR: Record<SectionId, string> = {
  brand: 'border-violet-500 text-violet-500', palette: 'border-pink-500 text-pink-500', type: 'border-sky-500 text-sky-500',
  content: 'border-emerald-500 text-emerald-500', musthave: 'border-amber-500 text-amber-500', restrictions: 'border-rose-500 text-rose-500',
}

function ChipEditor({ label, hint, values, suggestions, tone, onChange }: {
  label: string; hint?: string; values: string[]; suggestions: string[]; tone: string; onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const add = (v: string) => {
    const s = v.trim()
    if (!s || values.some((x) => x.toLowerCase() === s.toLowerCase())) return
    onChange([...values, s])
    setDraft('')
  }
  const free = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()))
  return (
    <div>
      <label className="label">{label}</label>
      {hint && <p className="text-xs text-slate-500 -mt-0.5 mb-1.5">{hint}</p>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span key={v} className={`chip ${tone} !rounded-lg`}>
            {v}
            <button aria-label={`Quitar ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}><X size={12} /></button>
          </span>
        ))}
        {!values.length && <span className="text-xs text-slate-400">Nada definido todavía</span>}
      </div>
      <div className="flex gap-2">
        <input className="input" value={draft} placeholder="Escribe y pulsa Enter…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(draft)} />
        <button className="btn shrink-0" aria-label="Añadir" onClick={() => add(draft)}><Plus size={16} /></button>
      </div>
      {free.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {free.slice(0, 5).map((s) => (
            <button key={s} className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-white/20 text-slate-500 hover:text-accent-500 hover:border-accent-500 transition" onClick={() => add(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function BrandPromptGenerator() {
  const { brand, toast, openStudioWith } = useApp()
  const b = brand!
  const brandId = b.id!
  const colors = useLiveQuery(() => db.colors.where('brandId').equals(brandId).sortBy('order'), [brandId], [])
  const typeStyles = useLiveQuery(() => db.typeStyles.where('brandId').equals(brandId).toArray(), [brandId], [])
  const logos = useLiveQuery(() => db.logos.where('brandId').equals(brandId).toArray(), [brandId], [])
  const socials = useLiveQuery(() => db.socials.where('brandId').equals(brandId).toArray(), [brandId], [])
  const history = useLiveQuery(async () => (await db.savedPrompts.where('brandId').equals(brandId).toArray()).sort((a, z) => Number(z.favorito) - Number(a.favorito) || z.fechaCreacion - a.fechaCreacion), [brandId], [])

  const [cfg, setCfg] = useState<PieceConfig>(defaultConfig())
  const [tab, setTab] = useState<'config' | 'result'>('config')
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [enriched, setEnriched] = useState<string | null>(null)
  const [useEnriched, setUseEnriched] = useState(true)
  const [busy, setBusy] = useState(false)
  const [apiKey, setApiKey] = useState(getGeminiKey())
  const [model, setModel] = useState(getGeminiModel())
  const set = <K extends keyof PieceConfig>(k: K, v: PieceConfig[K]) => { setCfg((c) => ({ ...c, [k]: v })); setEnriched(null) }

  const out = useMemo(
    () => compilePrompt({ brand: b, colors, typeStyles, logos, socials }, cfg),
    [b, colors, typeStyles, logos, socials, cfg],
  )
  useEffect(() => { setChecked(new Set()); setEnriched(null) }, [cfg.platform, brandId])

  const finalPrompt = enriched && useEnriched ? enriched : out.prompt
  const isSystem = cfg.platform === 'system-context'
  const isMj = cfg.platform === 'midjourney'
  const platform = PLATFORMS.find((p) => p.id === cfg.platform)!

  const patchBrand = (p: Partial<typeof b>) => db.brands.update(brandId, p)

  const copy = async (text: string, msg = 'Copiado al portapapeles') => { await copyText(text); toast(msg) }

  const save = async () => {
    const pt = PIECE_TYPES.find((x) => x.id === cfg.pieceType)!
    await db.savedPrompts.add({
      brandId, titulo: `${isSystem ? 'ADN Maestro' : pt.es} · ${platform.short}${cfg.headline ? ` · ${cfg.headline.slice(0, 24)}` : ''}`,
      plataformaDestino: cfg.platform, tipoPieza: isSystem ? 'system-context' : cfg.pieceType, promptGenerado: finalPrompt,
      negativePrompt: out.negative, parametrosJson: JSON.stringify(cfg), fechaCreacion: Date.now(), favorito: false,
    })
    toast('Guardado en el historial de prompts')
  }

  const share = async () => {
    const r = await shareText(`Prompt ${platform.short} · ${b.name}`, finalPrompt + (isMj || isSystem ? '' : `\n\nNegative prompt: ${out.negative}`))
    if (r === 'copied') toast('Compartir no disponible: prompt copiado')
  }

  const enrich = async () => {
    setGeminiKey(apiKey.trim()); setGeminiModel(model.trim() || 'gemini-flash-latest')
    setBusy(true)
    try {
      setEnriched(await enrichWithGemini(out.prompt, out.negative, out.langUsed))
      setUseEnriched(true)
      toast('Prompt enriquecido con Gemini ✨')
    } catch (e) { toast(e instanceof Error ? e.message : 'Error con Gemini', 'error') } finally { setBusy(false) }
  }

  const toStudio = () => {
    openStudioWith(RATIOS.find((r) => r.id === cfg.ratio)!.studioTpl)
    toast('Estudio abierto en formato ' + cfg.ratio)
  }

  const load = (json: string) => {
    try { setCfg({ ...defaultConfig(), ...JSON.parse(json) }); setTab('result'); setEnriched(null) } catch { toast('No se pudieron restaurar los parámetros', 'error') }
  }

  const styleSet = new Set((b.estiloVisual ?? []).map((s) => s.toLowerCase()))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Prompts IA de marca" subtitle="Compila prompts hiper-detallados con tu paleta, tipografías y reglas reales. Funciona 100% offline; Gemini es opcional." />

      {/* Pestañas móviles */}
      <div className="lg:hidden grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 sticky top-[60px] z-20">
        {(['config', 'result'] as const).map((k) => (
          <button key={k} id={`prompt-tab-${k}`} onClick={() => setTab(k)} className={`py-2 rounded-lg text-sm font-medium transition ${tab === k ? 'bg-white dark:bg-ink-700 shadow text-accent-600 dark:text-accent-400' : 'text-slate-500'}`}>
            {k === 'config' ? 'Configurar' : 'Prompt generado'}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ───────── Columna izquierda ───────── */}
        <div className={`flex flex-col gap-4 ${tab === 'config' ? '' : 'hidden'} lg:flex`}>
          <section className="card p-4">
            <h2 className="font-semibold mb-3">IA de destino</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLATFORMS.map((p) => {
                const Icon = ICONS[p.id]
                const on = cfg.platform === p.id
                return (
                  <button key={p.id} id={`platform-${p.id}`} onClick={() => set('platform', p.id)}
                    className={`text-left rounded-xl p-3 border transition ${on ? 'border-accent-500 bg-accent-500/10 ring-2 ring-accent-500/30' : 'border-slate-200 dark:border-white/10 hover:border-accent-500/50'}`}>
                    <Icon size={20} className={on ? 'text-accent-500' : 'text-slate-400'} />
                    <div className="text-sm font-semibold mt-1.5 leading-tight">{p.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{p.desc}</div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="card p-4 grid gap-4">
            <div>
              <h2 className="font-semibold">ADN estético de tu marca</h2>
              <p className="text-xs text-slate-500">Se guarda en {b.name} y alimenta todos los prompts.</p>
            </div>
            <div>
              <label className="label">Estilo visual</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map((s) => {
                  const on = styleSet.has(s.es.toLowerCase())
                  return (
                    <button key={s.es} onClick={() => patchBrand({ estiloVisual: on ? (b.estiloVisual ?? []).filter((x) => x.toLowerCase() !== s.es.toLowerCase()) : [...(b.estiloVisual ?? []), s.es] })}
                      className={`chip transition ${on ? '!bg-accent-500 text-white' : 'hover:bg-accent-500/20'}`}>{s.es}</button>
                  )
                })}
              </div>
            </div>
            <Field label="Arquetipo de marca">
              <select className="input" value={b.arquetipo ?? ''} onChange={(e) => patchBrand({ arquetipo: e.target.value })}>
                <option value="">Sin definir</option>
                {ARCHETYPES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <ChipEditor label="Qué debe tener siempre" tone="!bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              values={b.elementosObligatorios ?? []} suggestions={SUGGESTED_MUST.map((s) => s.es)} onChange={(v) => patchBrand({ elementosObligatorios: v })} />
            <ChipEditor label="Qué nunca debe aparecer" hint="Se convierte en el negative prompt de la marca." tone="!bg-rose-500/15 text-rose-600 dark:text-rose-400"
              values={b.elementosProhibidos ?? []} suggestions={SUGGESTED_BAN.map((s) => s.es)} onChange={(v) => patchBrand({ elementosProhibidos: v })} />
          </section>

          {!isSystem && (
            <section className="card p-4 grid gap-3">
              <h2 className="font-semibold">Pieza a generar</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tipo de pieza">
                  <select id="piece-type" className="input" value={cfg.pieceType} onChange={(e) => set('pieceType', e.target.value as PieceConfig['pieceType'])}>
                    {PIECE_TYPES.map((p) => <option key={p.id} value={p.id}>{p.es}</option>)}
                  </select>
                </Field>
                <Field label="Formato">
                  <select id="piece-ratio" className="input" value={cfg.ratio} onChange={(e) => set('ratio', e.target.value as PieceConfig['ratio'])}>
                    {RATIOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Objetivo o tema"><input id="piece-topic" className="input" placeholder="Ej. 2x1 en temporada de invierno" value={cfg.topic} onChange={(e) => set('topic', e.target.value)} /></Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Titular (Headline)"><input id="piece-headline" className="input" value={cfg.headline} onChange={(e) => set('headline', e.target.value)} /></Field>
                <Field label="Llamado a la acción (CTA)"><input id="piece-cta" className="input" value={cfg.cta} onChange={(e) => set('cta', e.target.value)} /></Field>
              </div>
              <Field label="Zona reservada para el logo">
                <div className="grid grid-cols-3 gap-1 w-40 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
                  {LOGO_POSITIONS.map((p) => (
                    <button key={p.id} title={p.es} aria-label={p.es} onClick={() => set('logoPos', p.id)}
                      className={`h-8 rounded-md border-2 transition ${cfg.logoPos === p.id ? 'bg-accent-500 border-accent-500' : 'border-dashed border-slate-300 dark:border-white/20 hover:border-accent-500'}`} />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">{LOGO_POSITIONS.find((p) => p.id === cfg.logoPos)!.es}</p>
              </Field>
            </section>
          )}

          <section className="card p-4 grid gap-2">
            <label className="label !mb-0">Idioma del prompt</label>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5">
              {(['es', 'en'] as const).map((l) => (
                <button key={l} id={`lang-${l}`} onClick={() => set('lang', l)} className={`py-1.5 rounded-lg text-sm font-medium ${cfg.lang === l ? 'bg-white dark:bg-ink-700 shadow' : 'text-slate-500'}`}>
                  {l === 'es' ? 'Español' : 'Inglés técnico'}
                </button>
              ))}
            </div>
            {isMj && <p className="text-xs text-amber-500">Midjourney rinde mejor en inglés: el prompt se genera siempre en inglés técnico. Los textos entre comillas se conservan.</p>}
            <button className="btn btn-primary mt-1 lg:hidden" onClick={() => setTab('result')}><Wand2 size={16} /> Ver prompt</button>
          </section>
        </div>

        {/* ───────── Columna derecha ───────── */}
        <div className={`flex flex-col gap-4 ${tab === 'result' ? '' : 'hidden'} lg:flex lg:sticky lg:top-24`}>
          <section className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold flex items-center gap-2">{platform.label} <span className="chip">{out.langUsed.toUpperCase()}</span>{enriched && useEnriched && <span className="chip !bg-emerald-500/20 text-emerald-500">Gemini</span>}</h2>
              <div className="flex flex-wrap gap-1.5">
                <button id="copy-prompt" className="btn btn-primary" onClick={() => copy(finalPrompt)}><Copy size={16} /> Copiar prompt</button>
                <button id="save-prompt" className="btn" onClick={save}><Save size={16} /> Guardar</button>
                <button id="share-prompt" className="btn" onClick={share}><Share2 size={16} /> Compartir</button>
              </div>
            </div>

            <div id="prompt-output" className="max-h-[440px] overflow-auto grid gap-2 pr-1">
              {enriched && useEnriched ? (
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed rounded-xl p-3 bg-slate-100 dark:bg-ink-900">{enriched}</pre>
              ) : (
                <>
                  {out.sections.map((s) => (
                    <div key={s.id + s.title} className={`rounded-xl p-3 bg-slate-100/80 dark:bg-ink-900 border-l-4 ${SECTION_COLOR[s.id].split(' ')[0]}`}>
                      <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${SECTION_COLOR[s.id].split(' ')[1]}`}>{s.title}</div>
                      <div className="text-sm leading-relaxed grid gap-0.5">{s.lines.map((l, i) => <p key={i} className="break-words">{l}</p>)}</div>
                    </div>
                  ))}
                  {isMj && <code className="block rounded-xl p-3 bg-slate-900 text-emerald-300 text-xs break-words">{out.prompt}</code>}
                </>
              )}
            </div>

            {enriched && (
              <button className="text-xs text-accent-500 mt-2 flex items-center gap-1" onClick={() => setUseEnriched((u) => !u)}><RotateCcw size={12} /> {useEnriched ? 'Ver versión determinista' : 'Ver versión enriquecida'}</button>
            )}
          </section>

          {!isSystem && (
            <section className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-rose-500"><ShieldAlert size={16} /> Negative prompt</h3>
                <button id="copy-negative" className="btn !py-1" onClick={() => copy(out.negative, 'Negative prompt copiado')}><Copy size={14} /> Copiar</button>
              </div>
              <p className="text-sm rounded-xl p-3 bg-rose-500/10 break-words">{out.negative}</p>
            </section>
          )}

          <section className="card p-4">
            <h3 className="font-semibold text-sm mb-2">Checklist de verificación visual</h3>
            <ul className="grid gap-1">
              {out.checklist.map((c, i) => {
                const on = checked.has(i)
                return (
                  <li key={i}>
                    <button className="w-full flex items-start gap-2 text-left text-sm p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                      onClick={() => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })}>
                      {on ? <CheckSquare size={16} className="text-emerald-500 shrink-0 mt-0.5" /> : <Square size={16} className="text-slate-400 shrink-0 mt-0.5" />}
                      <span className={on ? 'line-through opacity-50' : ''}>{c}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {!isSystem && <button id="to-studio" className="btn btn-primary w-full mt-3" onClick={toStudio}><Wand2 size={16} /> Llevar al Estudio de Edición ({cfg.ratio})</button>}
          </section>

          <details className="card p-4">
            <summary className="cursor-pointer font-semibold text-sm flex items-center gap-2"><KeyRound size={16} /> Enriquecer con Gemini (opcional)</summary>
            <div className="grid gap-3 mt-3">
              <p className="text-xs text-slate-500">Usa tu clave gratuita de Google AI Studio. Se guarda solo en este dispositivo (localStorage) y se envía únicamente a Google. Requiere conexión.</p>
              <input className="input" type="password" placeholder="Clave de API" value={apiKey} onChange={(e) => setApiKey(e.target.value)} aria-label="Clave de API de Gemini" />
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Modelo de Gemini" />
              <button className="btn" disabled={busy || !apiKey.trim()} onClick={enrich}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Mejorar prompt</button>
            </div>
          </details>
        </div>
      </div>

      {/* Historial */}
      <section className="card p-4" id="prompt-history">
        <h2 className="font-semibold mb-3">Historial de prompts ({history.length})</h2>
        {!history.length && <p className="text-sm text-slate-400">Aún no has guardado prompts para esta marca.</p>}
        <div className="grid md:grid-cols-2 gap-3">
          {history.map((h) => (
            <article key={h.id} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{h.titulo}</div>
                  <div className="text-[11px] text-slate-500">{PLATFORMS.find((p) => p.id === h.plataformaDestino)?.label} · {new Date(h.fechaCreacion).toLocaleDateString('es')}</div>
                </div>
                <button aria-label="Favorito" onClick={() => db.savedPrompts.update(h.id!, { favorito: !h.favorito })}>
                  <Star size={18} className={h.favorito ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
                </button>
              </div>
              <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-line">{h.promptGenerado}</p>
              <div className="flex gap-1.5">
                <button className="btn !py-1 text-xs" onClick={() => load(h.parametrosJson)}><RotateCcw size={13} /> Abrir</button>
                <button className="btn !py-1 text-xs" onClick={() => copy(h.promptGenerado)}><Copy size={13} /> Copiar</button>
                <button className="btn btn-danger !py-1 ml-auto" aria-label="Eliminar" onClick={() => confirm('¿Eliminar este prompt?') && db.savedPrompts.delete(h.id!)}><Trash2 size={13} /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
