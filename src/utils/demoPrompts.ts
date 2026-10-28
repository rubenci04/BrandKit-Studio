import { db } from '../db/brandDb'
import { compilePrompt, defaultConfig, type PieceConfig } from './promptCompiler'

const EXAMPLES: { titulo: string; cfg: Partial<PieceConfig> }[] = [
  {
    titulo: 'Flyer 2x1 de invierno · ChatGPT + Canva',
    cfg: { platform: 'chatgpt-canva', pieceType: 'oferta', ratio: '4:5', topic: '2x1 en café de especialidad en temporada de invierno', headline: '2x1 en tu café de invierno', cta: 'Pide el tuyo hoy', logoPos: 'tr' },
  },
  {
    titulo: 'Apertura de sucursal · Claude + Canva',
    cfg: { platform: 'claude-canva', pieceType: 'evento', ratio: '16:9', topic: 'Apertura de nueva sucursal Aurora Café', headline: 'Abrimos nuestra nueva casa', cta: 'Ven a conocernos', logoPos: 'tl' },
  },
  {
    titulo: 'Historia cálida de lanzamiento · Gemini',
    cfg: { platform: 'gemini-imagen', pieceType: 'lanzamiento', ratio: '9:16', topic: 'Lanzamiento del nuevo blend Amanecer de origen único', headline: 'Nuevo blend Amanecer', cta: 'Descúbrelo', logoPos: 'bc' },
  },
]

/** Guarda 3 prompts de ejemplo en la marca demo (una sola vez por instalación). */
export async function ensureDemoPrompts() {
  const brands = await db.brands.where('name').equals('Aurora Café').toArray()
  for (const brand of brands) {
    const flag = `bk-demo-prompts-${brand.id}`
    if (localStorage.getItem(flag)) continue
    localStorage.setItem(flag, '1')
    if ((await db.savedPrompts.where('brandId').equals(brand.id!).count()) > 0) continue
    const [colors, typeStyles, logos, socials] = await Promise.all([
      db.colors.where('brandId').equals(brand.id!).sortBy('order'),
      db.typeStyles.where('brandId').equals(brand.id!).toArray(),
      db.logos.where('brandId').equals(brand.id!).toArray(),
      db.socials.where('brandId').equals(brand.id!).toArray(),
    ])
    let i = 0
    for (const ex of EXAMPLES) {
      const cfg = { ...defaultConfig(), ...ex.cfg } as PieceConfig
      const out = compilePrompt({ brand, colors, typeStyles, logos, socials }, cfg)
      await db.savedPrompts.add({
        brandId: brand.id!, titulo: ex.titulo, plataformaDestino: cfg.platform, tipoPieza: cfg.pieceType,
        promptGenerado: out.prompt, negativePrompt: out.negative, parametrosJson: JSON.stringify(cfg),
        fechaCreacion: Date.now() + i++, favorito: i === 1,
      })
    }
  }
}
