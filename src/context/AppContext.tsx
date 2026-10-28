import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureSeed, type Brand } from '../db/brandDb'
import { registerBrandFonts } from '../lib/fonts'
import { ensureDemoPrompts } from '../utils/demoPrompts'

export type ViewId = 'dashboard' | 'colors' | 'typography' | 'logos' | 'studio' | 'prompts' | 'social' | 'export'

interface Ctx {
  brands: Brand[]
  brand?: Brand
  setBrandId: (id: number) => void
  view: ViewId
  setView: (v: ViewId) => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  toast: (msg: string, kind?: 'ok' | 'error') => void
  ready: boolean
  /** Plantilla del Estudio a abrir (p. ej. desde el generador de prompts) */
  studioPreset: string | null
  openStudioWith: (templateId: string) => void
  clearStudioPreset: () => void
}

const AppCtx = createContext<Ctx>(null!)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [brandId, setBrandIdState] = useState<number | undefined>(() => {
    const v = localStorage.getItem('bk-brand')
    return v ? Number(v) : undefined
  })
  const [view, setView] = useState<ViewId>('dashboard')
  const [studioPreset, setStudioPreset] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('bk-theme') as 'dark' | 'light') || 'dark')
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: 'ok' | 'error' }[]>([])

  useEffect(() => { ensureSeed().then(ensureDemoPrompts).then(() => setReady(true)) }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('bk-theme', theme)
  }, [theme])

  const brands = useLiveQuery(() => db.brands.orderBy('createdAt').toArray(), [], []) as Brand[]
  const brand = useMemo(() => brands.find((b) => b.id === brandId) ?? brands[0], [brands, brandId])

  useEffect(() => { if (brand?.id) registerBrandFonts(brand.id) }, [brand?.id])

  const setBrandId = useCallback((id: number) => {
    setBrandIdState(id)
    localStorage.setItem('bk-brand', String(id))
  }, [])

  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }, [])

  const value: Ctx = {
    brands, brand, setBrandId, view, setView, theme, ready, toast, studioPreset,
    openStudioWith: (id) => { setStudioPreset(id); setView('studio') },
    clearStudioPreset: () => setStudioPreset(null),
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  }

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-fadeUp px-4 py-2 rounded-full text-sm font-medium shadow-xl backdrop-blur ${t.kind === 'ok' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  )
}
