import Dexie, { type Table } from 'dexie'

/* ───────── Tipos ───────── */
export type ColorCategory = 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic'
export type LogoKind = 'main' | 'secondary' | 'icon' | 'monoLight' | 'monoDark' | 'favicon'
export type TypeRole = 'h1' | 'h2' | 'h3' | 'body' | 'button' | 'note'

export interface Brand {
  id?: number
  name: string
  tagline: string
  mission: string
  vision: string
  voice: string
  createdAt: number
  /** Etiquetas estéticas (Minimalista, Lujo…) */
  estiloVisual?: string[]
  /** Reglas que SIEMPRE deben respetarse en las piezas */
  elementosObligatorios?: string[]
  /** Negative prompt de marca: lo que NUNCA debe aparecer */
  elementosProhibidos?: string[]
  /** Arquetipo de marca (Cuidador, Creador…) */
  arquetipo?: string
}
export interface SavedPrompt {
  id?: number
  brandId: number
  titulo: string
  plataformaDestino: string
  tipoPieza: string
  promptGenerado: string
  negativePrompt: string
  parametrosJson: string
  fechaCreacion: number
  favorito: boolean
}
export interface BrandColor {
  id?: number
  brandId: number
  name: string
  hex: string
  category: ColorCategory
  order: number
}
export interface BrandFont {
  id?: number
  brandId: number
  family: string
  source: 'google' | 'local'
  blob?: Blob
  fileName?: string
}
export interface TypeStyle {
  id?: number
  brandId: number
  role: TypeRole
  family: string
  size: number
  unit: 'px' | 'rem'
  weight: number
  lineHeight: number
}
export interface BrandLogo {
  id?: number
  brandId: number
  kind: LogoKind
  name: string
  blob: Blob
  mime: string
}
export interface SocialProfile {
  id?: number
  brandId: number
  network: string
  handle: string
  url: string
  status: 'reserved' | 'available' | 'pending' | 'unavailable'
  bio: string
}
export interface BrandAsset {
  id?: number
  brandId: number
  name: string
  blob: Blob
  mime: string
  createdAt: number
}

/* ───────── Reglas de estilo de la marca demo ───────── */
export const DEMO_STYLE_RULES = {
  arquetipo: 'Cuidador',
  estiloVisual: ['Orgánico', 'Editorial', 'Minimalista'],
  elementosObligatorios: [
    'Alto contraste entre título y fondo',
    'Dejar margen superior derecho libre para el isotipo',
    'Incluir llamado a la acción claro',
    'Fotografía cálida con textura natural de café o granos',
  ],
  elementosProhibidos: [
    'No usar colores pastel fuera de la paleta',
    'No saturar el fondo detrás del texto',
    'No deformar proporciones ni usar tipografías manuscritas',
    'No usar tonos fríos azulados dominantes',
  ],
}

/* ───────── Base de datos ───────── */
class BrandDB extends Dexie {
  brands!: Table<Brand, number>
  colors!: Table<BrandColor, number>
  fonts!: Table<BrandFont, number>
  typeStyles!: Table<TypeStyle, number>
  logos!: Table<BrandLogo, number>
  socials!: Table<SocialProfile, number>
  assets!: Table<BrandAsset, number>
  savedPrompts!: Table<SavedPrompt, number>

  constructor() {
    super('brandkit-studio')
    this.version(1).stores({
      brands: '++id, name, createdAt',
      colors: '++id, brandId, category, order',
      fonts: '++id, brandId, family',
      typeStyles: '++id, brandId, role',
      logos: '++id, brandId, kind',
      socials: '++id, brandId, network',
      assets: '++id, brandId, createdAt',
    })
    // v2: añade historial de prompts IA. Las tablas existentes se conservan intactas.
    this.version(2)
      .stores({ savedPrompts: '++id, brandId, fechaCreacion' })
      .upgrade((tx) =>
        tx.table('brands').toCollection().modify((b: Brand) => {
          b.estiloVisual ??= b.name === 'Aurora Café' ? [...DEMO_STYLE_RULES.estiloVisual] : []
          b.elementosObligatorios ??= b.name === 'Aurora Café' ? [...DEMO_STYLE_RULES.elementosObligatorios] : []
          b.elementosProhibidos ??= b.name === 'Aurora Café' ? [...DEMO_STYLE_RULES.elementosProhibidos] : []
          if (b.name === 'Aurora Café') b.arquetipo ??= DEMO_STYLE_RULES.arquetipo
        }),
      )
  }
}

export const db = new BrandDB()

/* ───────── Eliminación en cascada ───────── */
export async function deleteBrand(id: number) {
  await db.transaction('rw', [db.brands, db.colors, db.fonts, db.typeStyles, db.logos, db.socials, db.assets, db.savedPrompts], async () => {
    await Promise.all([
      db.colors.where('brandId').equals(id).delete(),
      db.fonts.where('brandId').equals(id).delete(),
      db.typeStyles.where('brandId').equals(id).delete(),
      db.logos.where('brandId').equals(id).delete(),
      db.socials.where('brandId').equals(id).delete(),
      db.assets.where('brandId').equals(id).delete(),
      db.savedPrompts.where('brandId').equals(id).delete(),
    ])
    await db.brands.delete(id)
  })
}

/* ───────── Datos de demostración ───────── */
const svgBlob = (svg: string) => new Blob([svg], { type: 'image/svg+xml' })

const logoMain = (fg: string, accent: string, text: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 160"><g transform="translate(20 20)"><circle cx="60" cy="60" r="60" fill="${fg}"/><path d="M30 78c0-22 14-40 34-46-6 12-4 22 6 30 10 8 18 14 14 26-2 8-10 14-22 14-18 0-32-8-32-24z" fill="${accent}"/><path d="M60 100c-6-10 0-18 6-24" stroke="${text}" stroke-width="4" fill="none" stroke-linecap="round"/></g><text x="165" y="82" font-family="Poppins,Outfit,sans-serif" font-weight="700" font-size="48" fill="${text}">Aurora</text><text x="167" y="120" font-family="Inter,Outfit,sans-serif" font-weight="400" font-size="26" letter-spacing="8" fill="${accent}">CAFÉ</text></svg>`

const logoIcon = (fg: string, accent: string, text: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="${fg}"/><path d="M30 78c0-22 14-40 34-46-6 12-4 22 6 30 10 8 18 14 14 26-2 8-10 14-22 14-18 0-32-8-32-24z" fill="${accent}"/><path d="M60 100c-6-10 0-18 6-24" stroke="${text}" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`

export async function seedDemoBrand(): Promise<number> {
  return db.transaction('rw', [db.brands, db.colors, db.fonts, db.typeStyles, db.logos, db.socials, db.assets, db.savedPrompts], async () => {
    const brandId = await db.brands.add({
      name: 'Aurora Café',
      tagline: 'Despierta tu mejor mañana',
      mission: 'Llevar café de especialidad de origen único a cada hogar, con prácticas justas para los productores y un aroma que inspire.',
      vision: 'Ser la marca de café artesanal más querida de Latinoamérica para 2030.',
      voice: 'Cálida, cercana y optimista. Hablamos de tú, usamos frases cortas y un toque de humor suave. Evitamos tecnicismos innecesarios.',
      createdAt: Date.now(),
      arquetipo: DEMO_STYLE_RULES.arquetipo,
      estiloVisual: [...DEMO_STYLE_RULES.estiloVisual],
      elementosObligatorios: [...DEMO_STYLE_RULES.elementosObligatorios],
      elementosProhibidos: [...DEMO_STYLE_RULES.elementosProhibidos],
    })

    const c = (name: string, hex: string, category: ColorCategory, order: number): BrandColor => ({ brandId, name, hex, category, order })
    await db.colors.bulkAdd([
      c('Café Tostado', '#4B2E1E', 'primary', 0),
      c('Crema Aurora', '#F6EBDD', 'primary', 1),
      c('Naranja Amanecer', '#E8833A', 'secondary', 2),
      c('Oliva Cafetal', '#6B7F4A', 'secondary', 3),
      c('Dorado Miel', '#F2B84B', 'accent', 4),
      c('Grafito', '#2A2522', 'neutral', 5),
      c('Piedra', '#8C8178', 'neutral', 6),
      c('Blanco Leche', '#FFFFFF', 'neutral', 7),
      c('Éxito', '#2E9E5B', 'semantic', 8),
      c('Alerta', '#E0A100', 'semantic', 9),
      c('Error', '#C93C3C', 'semantic', 10),
      c('Información', '#2F7DBE', 'semantic', 11),
    ])

    await db.fonts.bulkAdd([
      { brandId, family: 'Poppins', source: 'google' },
      { brandId, family: 'Inter', source: 'google' },
    ])

    const t = (role: TypeRole, family: string, size: number, weight: number, lineHeight: number, unit: 'px' | 'rem' = 'px'): TypeStyle => ({
      brandId, role, family, size, unit, weight, lineHeight,
    })
    await db.typeStyles.bulkAdd([
      t('h1', 'Poppins', 48, 700, 1.1),
      t('h2', 'Poppins', 36, 600, 1.2),
      t('h3', 'Poppins', 24, 600, 1.3),
      t('body', 'Inter', 1, 400, 1.6, 'rem'),
      t('button', 'Inter', 16, 600, 1, 'px'),
      t('note', 'Inter', 12, 400, 1.4),
    ])

    const L = (kind: LogoKind, name: string, svg: string): BrandLogo => ({ brandId, kind, name, blob: svgBlob(svg), mime: 'image/svg+xml' })
    await db.logos.bulkAdd([
      L('main', 'Logo principal', logoMain('#4B2E1E', '#E8833A', '#4B2E1E')),
      L('secondary', 'Logo sobre fondo oscuro', logoMain('#F6EBDD', '#F2B84B', '#F6EBDD')),
      L('icon', 'Isotipo', logoIcon('#4B2E1E', '#E8833A', '#F6EBDD')),
      L('monoDark', 'Monocromático oscuro', logoMain('#2A2522', '#2A2522', '#2A2522')),
      L('monoLight', 'Monocromático claro', logoMain('#FFFFFF', '#FFFFFF', '#FFFFFF')),
      L('favicon', 'Favicon', logoIcon('#E8833A', '#4B2E1E', '#F6EBDD')),
    ])

    await db.socials.bulkAdd([
      { brandId, network: 'instagram', handle: '@auroracafe', url: 'https://instagram.com/auroracafe', status: 'reserved', bio: '☕ Café de especialidad de origen único\n🌱 Comercio justo · Tostado artesanal\n👇 Pide tu primera bolsa' },
      { brandId, network: 'tiktok', handle: '@auroracafe', url: 'https://tiktok.com/@auroracafe', status: 'reserved', bio: 'Tu dosis diaria de aroma ☕✨ Recetas, barismo y mañanas con calma.' },
      { brandId, network: 'x', handle: '@aurora_cafe', url: 'https://x.com/aurora_cafe', status: 'pending', bio: 'Despierta tu mejor mañana. Café de especialidad, hecho con cariño.' },
      { brandId, network: 'youtube', handle: '@AuroraCafe', url: 'https://youtube.com/@AuroraCafe', status: 'available', bio: 'Aprende a preparar el café perfecto en casa. Nuevo video cada semana.' },
      { brandId, network: 'whatsapp', handle: '+56 9 1234 5678', url: 'https://wa.me/56912345678', status: 'reserved', bio: 'Hola 👋 Somos Aurora Café. ¿En qué te podemos ayudar hoy?' },
      { brandId, network: 'web', handle: 'auroracafe.example', url: 'https://auroracafe.example', status: 'reserved', bio: '' },
    ])
    return brandId
  })
}

/** Inserta la marca demo la primera vez que se abre la app. */
export async function ensureSeed() {
  if ((await db.brands.count()) === 0) await seedDemoBrand()
}
