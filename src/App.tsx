import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Palette, Type, Shapes, Wand2, Share2, Package, Sun, Moon, Plus, ChevronDown, Check, Sparkles } from 'lucide-react'
import { useApp, type ViewId } from './context/AppContext'
import { db } from './db/brandDb'
import { Modal, Field } from './components/ui'
import Dashboard from './views/Dashboard'
import Colors from './views/Colors'
import Typography from './views/Typography'
import Logos from './views/Logos'
import Social from './views/Social'
import ExportCenter from './views/ExportCenter'

const Studio = lazy(() => import('./views/Studio'))
const BrandPromptGenerator = lazy(() => import('./features/ai-prompts/BrandPromptGenerator'))

const NAV: { id: ViewId; icon: typeof Palette }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'colors', icon: Palette },
  { id: 'typography', icon: Type },
  { id: 'logos', icon: Shapes },
  { id: 'studio', icon: Wand2 },
  { id: 'prompts', icon: Sparkles },
  { id: 'social', icon: Share2 },
  { id: 'export', icon: Package },
]

export default function App() {
  const { t } = useTranslation()
  const { view, setView, brand, brands, setBrandId, theme, toggleTheme, ready, toast } = useApp()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const createBrand = async () => {
    if (!newName.trim()) return
    const id = await db.brands.add({ name: newName.trim(), tagline: '', mission: '', vision: '', voice: '', createdAt: Date.now() })
    await db.typeStyles.bulkAdd((['h1', 'h2', 'h3', 'body', 'button', 'note'] as const).map((role, i) => ({
      brandId: id, role, family: 'Inter', size: [40, 32, 24, 16, 16, 12][i], unit: 'px' as const, weight: i < 3 ? 700 : 400, lineHeight: 1.4,
    })))
    setBrandId(id)
    setNewName('')
    setNewOpen(false)
    setPickerOpen(false)
    setView('dashboard')
    toast('Marca creada')
  }

  if (!ready) return <div className="h-full grid place-items-center text-slate-400">Cargando…</div>

  const Nav = ({ mobile }: { mobile?: boolean }) => (
    <>
      {NAV.map(({ id, icon: Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            id={`nav-${id}`}
            onClick={() => setView(id)}
            className={mobile
              ? `flex flex-col items-center gap-0.5 flex-1 py-2 text-[10px] transition ${active ? 'text-accent-500' : 'text-slate-500 dark:text-slate-400'}`
              : `flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition ${active ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400' : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}
          >
            <Icon size={mobile ? 20 : 18} />
            {t(`nav.${id}`)}
          </button>
        )
      })}
    </>
  )

  return (
    <div className="h-full flex">
      {/* Sidebar escritorio */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col gap-4 p-4 border-r border-slate-200 dark:border-white/10 bg-white/50 dark:bg-ink-900/60 backdrop-blur">
        <div className="flex items-center gap-3 px-1">
          <img src="/icon.svg" alt="" className="w-9 h-9 rounded-xl" />
          <div>
            <div className="font-semibold leading-tight">BrandKit Studio</div>
            <div className="text-[11px] text-slate-500">Identidad de marca offline</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1"><Nav /></nav>
        <div className="mt-auto text-xs text-slate-500 px-1">Todo se guarda en tu dispositivo.</div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-ink-900/60 backdrop-blur sticky top-0 z-30">
          <img src="/icon.svg" alt="" className="w-8 h-8 rounded-lg md:hidden" />
          <div className="relative">
            <button id="brand-picker" className="btn !pl-3" onClick={() => setPickerOpen((o) => !o)}>
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-accent-400 to-glow-400" />
              <span className="max-w-[140px] sm:max-w-[240px] truncate">{brand?.name ?? 'Sin marca'}</span>
              <ChevronDown size={16} />
            </button>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <div className="absolute left-0 top-full mt-2 w-64 z-50 card !bg-white dark:!bg-ink-800 p-1.5 animate-fadeUp">
                  {brands.map((b) => (
                    <button key={b.id} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-white/10"
                      onClick={() => { setBrandId(b.id!); setPickerOpen(false) }}>
                      <span className="truncate">{b.name}</span>
                      {b.id === brand?.id && <Check size={16} className="text-accent-500" />}
                    </button>
                  ))}
                  <button id="new-brand" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-accent-600 dark:text-accent-400 hover:bg-accent-500/10"
                    onClick={() => setNewOpen(true)}>
                    <Plus size={16} /> Nueva marca
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="ml-auto">
            <button id="theme-toggle" className="btn btn-icon" onClick={toggleTheme} aria-label="Cambiar tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto" key={`${brand?.id}-${view}`}>
            {brand ? (
              <Suspense fallback={<div className="text-slate-400">Cargando módulo…</div>}>
                {view === 'dashboard' && <Dashboard />}
                {view === 'colors' && <Colors />}
                {view === 'typography' && <Typography />}
                {view === 'logos' && <Logos />}
                {view === 'studio' && <Studio />}
                {view === 'prompts' && <BrandPromptGenerator />}
                {view === 'social' && <Social />}
                {view === 'export' && <ExportCenter />}
              </Suspense>
            ) : (
              <div className="text-center text-slate-500 py-20">Crea tu primera marca desde el selector superior.</div>
            )}
          </div>
        </main>

        {/* Barra inferior móvil */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-slate-200 dark:border-white/10 bg-white/90 dark:bg-ink-900/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <Nav mobile />
        </nav>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nueva marca">
        <div className="flex flex-col gap-4">
          <Field label="Nombre de la marca">
            <input id="new-brand-name" className="input" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createBrand()} />
          </Field>
          <button className="btn btn-primary" onClick={createBrand}>Crear marca</button>
        </div>
      </Modal>
    </div>
  )
}
