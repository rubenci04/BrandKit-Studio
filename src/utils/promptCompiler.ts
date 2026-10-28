import type { Brand, BrandColor, BrandLogo, SocialProfile, TypeStyle, ColorCategory } from '../db/brandDb'
import { colorFormats, contrastRatio, readableOn, wcagLevel, luminance } from '../lib/color'
import { netById } from '../lib/networks'

/* ═════════ Tipos públicos ═════════ */
export type PlatformId = 'chatgpt-canva' | 'claude-canva' | 'gemini-imagen' | 'ideogram-flujo' | 'midjourney' | 'system-context'
export type PieceType = 'flyer' | 'lanzamiento' | 'oferta' | 'educativo' | 'historia' | 'evento' | 'fondo' | 'mockup'
export type RatioId = '1:1' | '9:16' | '4:5' | '16:9'
export type LogoPos = 'tl' | 'tc' | 'tr' | 'cl' | 'cc' | 'cr' | 'bl' | 'bc' | 'br'
export type Lang = 'es' | 'en'
export type SectionId = 'brand' | 'palette' | 'type' | 'content' | 'musthave' | 'restrictions'

export interface PieceConfig {
  platform: PlatformId
  pieceType: PieceType
  ratio: RatioId
  topic: string
  headline: string
  cta: string
  logoPos: LogoPos
  lang: Lang
}
export interface BrandBundle {
  brand: Brand
  colors: BrandColor[]
  typeStyles: TypeStyle[]
  logos: BrandLogo[]
  socials: SocialProfile[]
}
export interface Section { id: SectionId; title: string; lines: string[] }
export interface PaletteRoles {
  bg: { name: string; hex: string }
  text: { name: string; hex: string }
  primary: { name: string; hex: string }
  secondary: { name: string; hex: string }
  accent: { name: string; hex: string }
  ratio: number
  level: string
}
export interface CompiledPrompt {
  prompt: string
  sections: Section[]
  negative: string
  checklist: string[]
  params: Record<string, string | number>
  roles: PaletteRoles
  langUsed: Lang
  size: { w: number; h: number }
}

/* ═════════ Catálogos (usados también por la UI) ═════════ */
export const PLATFORMS: { id: PlatformId; label: string; short: string; desc: string }[] = [
  { id: 'chatgpt-canva', label: 'ChatGPT + Canva', short: 'ChatGPT', desc: 'Plantilla Canva con HEX y fuentes exactas' },
  { id: 'claude-canva', label: 'Claude + Canva / SVG', short: 'Claude', desc: 'Maquetación editorial con tokens CSS' },
  { id: 'gemini-imagen', label: 'Gemini (Imagen 3)', short: 'Gemini', desc: 'Descripción visual narrativa' },
  { id: 'ideogram-flujo', label: 'Ideogram / Flux / DALL·E 3', short: 'Ideogram', desc: 'Flyers con texto exacto entre comillas' },
  { id: 'midjourney', label: 'Midjourney v6+', short: 'Midjourney', desc: 'Descriptores + parámetros --ar --no' },
  { id: 'system-context', label: 'ADN Maestro (contexto)', short: 'Contexto', desc: 'System prompt universal de marca' },
]

export const PIECE_TYPES: { id: PieceType; es: string; en: string }[] = [
  { id: 'flyer', es: 'Flyer promocional', en: 'promotional flyer' },
  { id: 'lanzamiento', es: 'Lanzamiento de producto', en: 'product launch graphic' },
  { id: 'oferta', es: 'Anuncio de oferta / descuento', en: 'sale / discount advertisement' },
  { id: 'educativo', es: 'Post educativo / Carrusel', en: 'educational post (carousel slide)' },
  { id: 'historia', es: 'Historia / Reel vertical', en: 'vertical story / reel cover' },
  { id: 'evento', es: 'Portada de evento / Webinar', en: 'event / webinar cover' },
  { id: 'fondo', es: 'Fondo corporativo limpio para logo', en: 'clean corporate background for logo overlay' },
  { id: 'mockup', es: 'Mockup de producto', en: 'product mockup scene' },
]

export const RATIOS: { id: RatioId; label: string; w: number; h: number; studioTpl: string }[] = [
  { id: '1:1', label: 'Cuadrado 1:1 · 1080×1080', w: 1080, h: 1080, studioTpl: 'post' },
  { id: '9:16', label: 'Historia 9:16 · 1080×1920', w: 1080, h: 1920, studioTpl: 'story' },
  { id: '4:5', label: 'Retrato feed 4:5 · 1080×1350', w: 1080, h: 1350, studioTpl: 'feed45' },
  { id: '16:9', label: 'Horizontal 16:9 · 1920×1080', w: 1920, h: 1080, studioTpl: 'wide' },
]

export const LOGO_POSITIONS: { id: LogoPos; es: string; en: string }[] = [
  { id: 'tl', es: 'Superior izquierda', en: 'top-left' }, { id: 'tc', es: 'Superior centro', en: 'top-center' },
  { id: 'tr', es: 'Superior derecha', en: 'top-right' }, { id: 'cl', es: 'Centro izquierda', en: 'middle-left' },
  { id: 'cc', es: 'Centro', en: 'center' }, { id: 'cr', es: 'Centro derecha', en: 'middle-right' },
  { id: 'bl', es: 'Inferior izquierda', en: 'bottom-left' }, { id: 'bc', es: 'Inferior centro', en: 'bottom-center' },
  { id: 'br', es: 'Inferior derecha', en: 'bottom-right' },
]

export const STYLE_OPTIONS: { es: string; en: string; descEs: string; descEn: string }[] = [
  { es: 'Minimalista', en: 'minimalist', descEs: 'composición limpia con abundante espacio negativo', descEn: 'clean composition with generous negative space' },
  { es: 'Corporativo', en: 'corporate', descEs: 'estructura ordenada, sobria y profesional', descEn: 'orderly, sober and professional structure' },
  { es: 'Urbano', en: 'urban', descEs: 'energía callejera, texturas crudas y tipografía contundente', descEn: 'street energy, raw textures and punchy typography' },
  { es: 'Editorial', en: 'editorial', descEs: 'maquetación de revista con jerarquía tipográfica marcada', descEn: 'magazine-style layout with strong typographic hierarchy' },
  { es: 'Futurista', en: 'futuristic', descEs: 'formas nítidas, gradientes sutiles y sensación tecnológica', descEn: 'crisp shapes, subtle gradients and a high-tech feel' },
  { es: 'Orgánico', en: 'organic', descEs: 'formas fluidas, texturas naturales y materiales cálidos', descEn: 'flowing shapes, natural textures and warm materials' },
  { es: 'Lujo', en: 'luxury', descEs: 'acabado premium, detalles refinados y contraste elegante', descEn: 'premium finish, refined details and elegant contrast' },
  { es: 'Geométrico', en: 'geometric', descEs: 'formas geométricas precisas y rejilla modular', descEn: 'precise geometric shapes and a modular grid' },
  { es: 'Vintage', en: 'vintage', descEs: 'aire retro, grano sutil y paleta nostálgica', descEn: 'retro feel, subtle grain and a nostalgic palette' },
  { es: 'Artesanal', en: 'handcrafted', descEs: 'detalles hechos a mano y calidez cercana', descEn: 'handmade details and approachable warmth' },
  { es: 'Audaz', en: 'bold', descEs: 'tipografía grande, colores vibrantes y mucho impacto', descEn: 'large type, vibrant colors and high impact' },
  { es: 'Tecnológico', en: 'tech', descEs: 'interfaz limpia, líneas finas y acentos luminosos', descEn: 'clean interface-like look, fine lines and luminous accents' },
]

export const ARCHETYPES = ['Creador', 'Cuidador', 'Explorador', 'Sabio', 'Héroe', 'Rebelde', 'Mago', 'Inocente', 'Amigo', 'Amante', 'Bufón', 'Gobernante']
const ARCH_EN: Record<string, string> = {
  Creador: 'Creator', Cuidador: 'Caregiver', Explorador: 'Explorer', Sabio: 'Sage', Héroe: 'Hero', Rebelde: 'Rebel',
  Mago: 'Magician', Inocente: 'Innocent', Amigo: 'Everyman', Amante: 'Lover', Bufón: 'Jester', Gobernante: 'Ruler',
}

export const SUGGESTED_MUST: { es: string; en: string }[] = [
  { es: 'Alto contraste entre título y fondo', en: 'High contrast between headline and background' },
  { es: 'Dejar margen superior derecho libre para el isotipo', en: 'Leave the top-right margin free for the icon mark' },
  { es: 'Incluir llamado a la acción claro', en: 'Include a clear call to action' },
  { es: 'Jerarquía visual clara: título > imagen > CTA', en: 'Clear visual hierarchy: headline > image > CTA' },
  { es: 'Márgenes generosos y alineación consistente', en: 'Generous margins and consistent alignment' },
]
export const SUGGESTED_BAN: { es: string; en: string }[] = [
  { es: 'No usar colores pastel fuera de la paleta', en: 'Do not use pastel colors outside the palette' },
  { es: 'No saturar el fondo detrás del texto', en: 'Do not clutter the background behind the text' },
  { es: 'No deformar proporciones ni usar tipografías manuscritas', en: 'Do not distort proportions or use handwritten fonts' },
  { es: 'No usar degradados arcoíris', en: 'No rainbow gradients' },
  { es: 'No añadir más de 2 familias tipográficas', en: 'No more than 2 type families' },
]

/* ═════════ Utilidades internas ═════════ */
type T = (es: string, en: string) => string
const mk = (lang: Lang): T => (es, en) => (lang === 'es' ? es : en)

const GEOMETRIC = ['Poppins', 'Montserrat', 'Outfit', 'Sora', 'Lexend', 'Urbanist', 'Josefin Sans', 'Quicksand', 'Manrope', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Raleway', 'Nunito']
const SERIF = ['Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Libre Baskerville', 'Cormorant Garamond', 'DM Serif Display', 'Crimson Text', 'Bitter']
const DISPLAY = ['Bebas Neue', 'Anton', 'Abril Fatface', 'Righteous', 'Fredoka', 'Oswald', 'Syne']
const SCRIPT = ['Pacifico', 'Lobster', 'Dancing Script', 'Caveat']

function fontCharacter(family: string, t: T) {
  if (SERIF.includes(family)) return t('serif elegante de carácter editorial', 'elegant editorial serif')
  if (DISPLAY.includes(family)) return t('display de alto impacto', 'high-impact display face')
  if (SCRIPT.includes(family)) return t('script / caligráfica', 'script / calligraphic')
  if (GEOMETRIC.includes(family)) return t('sans-serif geométrica moderna', 'modern geometric sans-serif')
  return t('sans-serif humanista y legible', 'legible humanist sans-serif')
}

const weightName = (w: number, t: T) =>
  w >= 800 ? t('extra-negrita', 'extra-bold') : w >= 700 ? t('negrita', 'bold') : w >= 600 ? t('seminegrita', 'semi-bold') : w >= 500 ? t('media', 'medium') : w <= 300 ? t('ligera', 'light') : t('regular', 'regular')

const px = (s: TypeStyle) => Math.round(s.unit === 'rem' ? s.size * 16 : s.size)
const rgbStr = (hex: string) => colorFormats(hex).RGB
const col = (c: { name: string; hex: string }) => `${c.name} ${c.hex} (${rgbStr(c.hex)})`

function translateRule(rule: string, lang: Lang) {
  if (lang === 'es') return rule
  const hit = [...SUGGESTED_MUST, ...SUGGESTED_BAN].find((s) => s.es.toLowerCase() === rule.trim().toLowerCase())
  return hit ? hit.en : rule
}

const styleTags = (b: Brand, lang: Lang) =>
  (b.estiloVisual ?? []).map((tag) => {
    const o = STYLE_OPTIONS.find((s) => s.es.toLowerCase() === tag.toLowerCase())
    return { label: o ? (lang === 'es' ? o.es : o.en) : tag, desc: o ? (lang === 'es' ? o.descEs : o.descEn) : '' }
  })

/** Asigna roles de color y valida el par fondo/texto con WCAG. */
export function deriveRoles(colors: BrandColor[]): PaletteRoles {
  const by = (c: ColorCategory) => colors.filter((x) => x.category === c)
  const prim = by('primary'), sec = by('secondary'), acc = by('accent')
  const bg = prim[0] ?? colors[0] ?? { name: 'Blanco', hex: '#FFFFFF' }
  const prio: Record<ColorCategory, number> = { primary: 0, neutral: 1, secondary: 2, accent: 3, semantic: 4 }
  const cand = colors
    .filter((c) => c.hex !== bg.hex)
    .map((c) => ({ c, r: contrastRatio(bg.hex, c.hex) }))
    .filter((x) => x.r >= 4.5)
    .sort((a, b) => prio[a.c.category] - prio[b.c.category] || b.r - a.r)
  let text: { name: string; hex: string }
  if (cand[0]) text = cand[0].c
  else { const h = readableOn(bg.hex); text = { name: h === '#000000' ? 'Negro' : 'Blanco', hex: h } }
  const ratio = contrastRatio(bg.hex, text.hex)
  // Colores de elementos: distintos del fondo y del texto para que sean visibles
  const used = new Set([bg.hex, text.hex])
  const pick = (...lists: BrandColor[][]) => {
    const c = lists.flat().find((x) => !used.has(x.hex))
    if (c) used.add(c.hex)
    return c
  }
  const primary = pick(prim, sec, acc) ?? bg
  const secondary = pick(sec, prim, acc) ?? primary
  const accent = pick(acc, sec, prim) ?? secondary
  return { bg, text, primary, secondary, accent, ratio, level: wcagLevel(ratio) }
}

function layoutLines(ratio: RatioId, pos: LogoPos, t: T): string[] {
  const posL = LOGO_POSITIONS.find((p) => p.id === pos)!
  const zone = t(
    `Zona segura del logo: deja LIMPIA y vacía (sin texto, rostros ni detalles) un área de ~18% del ancho en ${posL.es.toLowerCase()} para estampar después el logo oficial.`,
    `Logo safe zone: keep a CLEAN, empty area (no text, faces or details) of ~18% of the width at the ${posL.en} to stamp the official logo afterwards.`,
  )
  const g: Record<RatioId, string[]> = {
    '1:1': [
      t('Márgenes de seguridad de 8% en todo el contorno.', '8% safe margins all around.'),
      t('Titular en el tercio superior-central, ocupando ~40% del alto.', 'Headline in the upper-middle third, using ~40% of the height.'),
      t('Elemento visual principal en el centro-inferior; CTA en el 15% inferior.', 'Main visual in the lower-center; CTA in the bottom 15%.'),
    ],
    '9:16': [
      t('Evita el 14% superior y el 20% inferior (interfaz de la app).', 'Avoid the top 14% and bottom 20% (app UI overlay).'),
      t('Titular entre 22% y 42% del alto; visual principal entre 42% y 70%.', 'Headline between 22% and 42% of the height; main visual between 42% and 70%.'),
      t('CTA entre 72% y 80% del alto, centrado.', 'CTA between 72% and 80% of the height, centered.'),
    ],
    '4:5': [
      t('Márgenes de 7%; titular en el tercio superior.', '7% margins; headline in the top third.'),
      t('Elemento visual central; CTA en el 12% inferior.', 'Central visual; CTA in the bottom 12%.'),
    ],
    '16:9': [
      t('Composición en dos columnas: texto a la izquierda (45%), visual a la derecha (55%).', 'Two-column composition: text on the left (45%), visual on the right (55%).'),
      t('Titular arriba-izquierda, CTA directamente debajo del titular.', 'Headline top-left, CTA directly below the headline.'),
    ],
  }
  return [...g[ratio], zone]
}

function handles(socials: SocialProfile[], t: T) {
  const list = socials.filter((s) => s.handle).slice(0, 3).map((s) => `${netById(s.network).name}: ${s.handle}`)
  return list.length ? list.join(' · ') : t('(sin redes registradas)', '(no social handles registered)')
}

const LOGO_MISUSE = (t: T) => [
  t('estirar o deformar el logo', 'stretching or distorting the logo'),
  t('rotar el logo', 'rotating the logo'),
  t('cambiar los colores del logo', 'recoloring the logo'),
  t('añadir sombras al logo', 'adding shadows to the logo'),
  t('bajar la opacidad o el contraste del logo', 'lowering the logo opacity or contrast'),
  t('colocar el logo sobre fondos recargados', 'placing the logo on busy backgrounds'),
]

/* ═════════ Compilador ═════════ */
export function compilePrompt(bundle: BrandBundle, cfg: PieceConfig): CompiledPrompt {
  const { brand, colors, typeStyles, logos, socials } = bundle
  // Midjourney rinde mejor en inglés técnico: se fuerza siempre.
  const lang: Lang = cfg.platform === 'midjourney' ? 'en' : cfg.lang
  const t = mk(lang)
  const roles = deriveRoles(colors)
  const size = RATIOS.find((r) => r.id === cfg.ratio)!
  const piece = PIECE_TYPES.find((p) => p.id === cfg.pieceType)!
  const pieceName = lang === 'es' ? piece.es : piece.en
  const tags = styleTags(brand, lang)
  const must = (brand.elementosObligatorios ?? []).map((r) => translateRule(r, lang))
  const ban = (brand.elementosProhibidos ?? []).map((r) => translateRule(r, lang))
  const h1 = typeStyles.find((s) => s.role === 'h1')
  const h2 = typeStyles.find((s) => s.role === 'h2')
  const body = typeStyles.find((s) => s.role === 'body')
  const btn = typeStyles.find((s) => s.role === 'button')
  const topic = cfg.topic.trim() || t('promoción de la marca', 'brand promotion')
  const headline = cfg.headline.trim()
  const cta = cfg.cta.trim()
  const posL = LOGO_POSITIONS.find((p) => p.id === cfg.logoPos)!
  const posName = lang === 'es' ? posL.es.toLowerCase() : posL.en
  const bgLum = luminance(roles.bg.hex)
  const dark = bgLum < 0.25
  const hexes = Array.from(new Set(colors.map((c) => c.hex))).join(', ')
  const arche = brand.arquetipo ? (lang === 'es' ? brand.arquetipo : ARCH_EN[brand.arquetipo] ?? brand.arquetipo) : ''

  /* Negative prompt */
  const negItems = [
    ...ban,
    t(`colores fuera de la paleta de marca (usar solo ${hexes})`, `colors outside the brand palette (use only ${hexes})`),
    ...LOGO_MISUSE(t),
    t('texto ilegible, mal escrito o con errores ortográficos', 'illegible, misspelled or garbled text'),
    t('logotipos o marcas inventadas', 'invented logos or brands'),
    t('marcas de agua', 'watermarks'),
  ]
  const negative = negItems.join(', ')

  /* ───── Secciones comunes ───── */
  const brandSec: Section = {
    id: 'brand', title: t('Contexto de marca', 'Brand context'),
    lines: [
      `${t('Marca', 'Brand')}: ${brand.name}${brand.tagline ? ` — "${brand.tagline}"` : ''}`,
      ...(brand.voice ? [`${t('Tono de voz', 'Voice & tone')}: ${brand.voice}`] : []),
      ...(arche ? [`${t('Arquetipo', 'Archetype')}: ${arche}`] : []),
      ...(tags.length ? [`${t('Estilo visual', 'Visual style')}: ${tags.map((x) => x.label).join(', ')}${tags.some((x) => x.desc) ? ' — ' + tags.filter((x) => x.desc).map((x) => x.desc).join('; ') : ''}`] : []),
      ...(brand.mission ? [`${t('Misión', 'Mission')}: ${brand.mission}`] : []),
    ],
  }

  const paletteLines = [
    `${t('Fondo dominante', 'Dominant background')}: ${col(roles.bg)}`,
    `${t('Texto principal sobre el fondo', 'Main text on the background')}: ${col(roles.text)} → ${t('contraste WCAG', 'WCAG contrast')} ${roles.ratio.toFixed(2)}:1 (${roles.level})`,
    `${t('Color primario (formas y elementos principales)', 'Primary color (shapes and main elements)')}: ${col(roles.primary)}`,
    `${t('Color secundario', 'Secondary color')}: ${col(roles.secondary)}`,
    `${t('Acento exclusivo para CTA y elementos destacados', 'Accent reserved for the CTA and highlights')}: ${col(roles.accent)}`,
    t(`Usa ÚNICAMENTE estos HEX: ${hexes}`, `Use ONLY these HEX codes: ${hexes}`),
  ]
  const paletteSec: Section = { id: 'palette', title: t('Paleta obligatoria', 'Mandatory palette'), lines: paletteLines }

  const typeLines = [
    `${t('Títulos', 'Headlines')}: ${h1?.family ?? 'Inter'} ${weightName(h1?.weight ?? 700, t)} (${h1?.weight ?? 700}) — ${fontCharacter(h1?.family ?? 'Inter', t)}`,
    ...(h2 ? [`${t('Subtítulos', 'Subheads')}: ${h2.family} ${h2.weight}`] : []),
    `${t('Cuerpo', 'Body')}: ${body?.family ?? 'Inter'} ${weightName(body?.weight ?? 400, t)} — ${fontCharacter(body?.family ?? 'Inter', t)}`,
    ...(btn ? [`${t('Botón / CTA', 'Button / CTA')}: ${btn.family} ${btn.weight}`] : []),
    ...layoutLines(cfg.ratio, cfg.logoPos, t),
  ]
  const typeSec: Section = { id: 'type', title: t('Tipografía y layout', 'Typography & layout'), lines: typeLines }

  const contentLines = [
    `${t('Pieza', 'Piece')}: ${pieceName} · ${cfg.ratio} (${size.w}×${size.h}px)`,
    `${t('Tema / objetivo', 'Topic / goal')}: ${topic}`,
    headline ? `${t('Titular exacto', 'Exact headline')}: "${headline}"` : t('Titular: propón uno corto (máx. 6 palabras) acorde al tono de voz.', 'Headline: suggest a short one (max 6 words) matching the tone of voice.'),
    cta ? `${t('Llamado a la acción', 'Call to action')}: "${cta}"` : t('CTA: incluye un llamado a la acción breve y claro.', 'CTA: include a short, clear call to action.'),
    `${t('Pie de firma', 'Sign-off')}: ${handles(socials, t)}`,
  ]
  const contentSec: Section = { id: 'content', title: t('Contenido de la pieza', 'Piece content'), lines: contentLines }

  const mustLines = [
    ...must,
    t(`Zona segura (clearspace) para el logo en ${posName}`, `Logo clearspace (safe zone) at the ${posName}`),
    t(`Pie con ${handles(socials, t)}`, `Footer with ${handles(socials, t)}`),
  ]
  const mustSec: Section = { id: 'musthave', title: t('Qué no debe faltar', 'Must-haves'), lines: mustLines.map((l) => `✔ ${l}`) }

  const restrSec: Section = {
    id: 'restrictions', title: t('Restricciones / Negative prompt', 'Restrictions / Negative prompt'),
    lines: negItems.map((l) => `✘ ${l}`),
  }

  /* ───── Por plataforma ───── */
  let sections: Section[] = []
  let intro = ''
  let outro = ''
  let render: 'titled' | 'plain' = 'titled'
  const params: Record<string, string | number> = { ar: cfg.ratio, width: size.w, height: size.h }

  switch (cfg.platform) {
    case 'chatgpt-canva': {
      intro = t(
        `Actúa como director de arte. Usando Canva (Canva GPT / plugin), diseña una plantilla de ${pieceName.toLowerCase()} de ${size.w}×${size.h}px para la marca ${brand.name}. Respeta exactamente las especificaciones.`,
        `Act as an art director. Using Canva (Canva GPT / plugin), design a ${size.w}×${size.h}px ${pieceName} template for the brand ${brand.name}. Follow the specs exactly.`,
      )
      sections = [brandSec, paletteSec, typeSec, contentSec, mustSec, restrSec]
      sections[1] = {
        ...paletteSec,
        lines: [...paletteLines.slice(0, 5), t('Fondos y formas: usa solo los HEX anteriores, sin degradados fuera de paleta.', 'Backgrounds and shapes: use only the HEX codes above, no off-palette gradients.'), paletteLines[5]],
      }
      outro = t(
        'Entrega: describe primero la estructura de la plantilla (capas y jerarquía de lectura), luego crea el diseño en Canva y ofrece 2 variaciones de composición.',
        'Deliver: first describe the template structure (layers and reading order), then build the design in Canva and offer 2 composition variations.',
      )
      break
    }
    case 'claude-canva': {
      intro = t(
        `Eres un diseñador editorial. Genera ${pieceName.toLowerCase()} de ${size.w}×${size.h}px para ${brand.name} usando Canva MCP o, si no está disponible, un Artifact SVG (viewBox="0 0 ${size.w} ${size.h}") con maquetación precisa.`,
        `You are an editorial designer. Produce a ${size.w}×${size.h}px ${pieceName} for ${brand.name} using Canva MCP or, if unavailable, an SVG Artifact (viewBox="0 0 ${size.w} ${size.h}") with precise layout.`,
      )
      const m = Math.round(size.w * 0.08)
      const h1px = h1 ? px(h1) : 48
      const css = [
        t('Tokens de diseño (CSS):', 'Design tokens (CSS):'),
        `--color-bg: ${roles.bg.hex}; --color-text: ${roles.text.hex};`,
        `--color-primary: ${roles.primary.hex}; --color-secondary: ${roles.secondary.hex}; --color-accent: ${roles.accent.hex};`,
        `--font-title: '${h1?.family ?? 'Inter'}', ${GEOMETRIC.includes(h1?.family ?? '') ? 'sans-serif' : SERIF.includes(h1?.family ?? '') ? 'serif' : 'sans-serif'}; --font-body: '${body?.family ?? 'Inter'}', sans-serif;`,
      ]
      const prop = [
        t('Proporciones matemáticas:', 'Mathematical proportions:'),
        t(`Rejilla de 12 columnas, margen exterior ${m}px (8% del ancho), gutter ${Math.round(m / 3)}px.`, `12-column grid, ${m}px outer margin (8% of width), ${Math.round(m / 3)}px gutter.`),
        t(`Escala tipográfica base ${h1px}px (H1) con razón 1.25 → H2 ${Math.round(h1px / 1.25)}px, cuerpo ${Math.round(h1px / 1.25 ** 3)}px.`, `Base type scale ${h1px}px (H1) with ratio 1.25 → H2 ${Math.round(h1px / 1.25)}px, body ${Math.round(h1px / 1.25 ** 3)}px.`),
      ]
      sections = [
        brandSec,
        { ...paletteSec, lines: [...paletteLines, ...css] },
        { ...typeSec, lines: [...typeLines, ...prop] },
        contentSec,
        { ...mustSec, lines: [...mustSec.lines, t(`✔ Contraste verificado WCAG: ${roles.text.hex} sobre ${roles.bg.hex} = ${roles.ratio.toFixed(2)}:1 (${roles.level})`, `✔ WCAG verified contrast: ${roles.text.hex} on ${roles.bg.hex} = ${roles.ratio.toFixed(2)}:1 (${roles.level})`)] },
        restrSec,
      ]
      outro = t(
        'Entrega código limpio y comentado (o el diseño en Canva), con composición equilibrada y espacios en blanco deliberados.',
        'Deliver clean, commented code (or the Canva design) with balanced composition and deliberate whitespace.',
      )
      break
    }
    case 'gemini-imagen': {
      render = 'plain'
      const atmosphere = tags.length ? tags.map((x) => x.desc || x.label).join(', ') : t('composición equilibrada y profesional', 'balanced, professional composition')
      const light = dark
        ? t('iluminación cálida de bajo contraste con luces suaves y sombras profundas', 'warm low-key lighting with soft highlights and deep shadows')
        : t('luz natural difusa de estudio, sombras suaves y limpias', 'soft diffused natural studio light with gentle, clean shadows')
      sections = [
        { ...brandSec, lines: [t(
          `Crea un ${pieceName.toLowerCase()} en formato ${cfg.ratio} (${size.w}×${size.h}px) para la marca ${brand.name}${brand.tagline ? `, cuyo eslogan es "${brand.tagline}"` : ''}. Tema: ${topic}. Atmósfera: ${atmosphere}; ${light}.`,
          `Create a ${pieceName} in ${cfg.ratio} format (${size.w}×${size.h}px) for the brand ${brand.name}${brand.tagline ? `, whose tagline is "${brand.tagline}"` : ''}. Topic: ${topic}. Atmosphere: ${atmosphere}; ${light}.`,
        )] },
        { ...paletteSec, lines: [t(
          `Paleta cromática: dominante ${col(roles.bg)} como fondo, con ${col(roles.primary)} y ${col(roles.secondary)} en los elementos principales, y ${col(roles.accent)} como único acento para lo destacado. Texto en ${col(roles.text)} (contraste ${roles.ratio.toFixed(1)}:1).`,
          `Color palette: dominant ${col(roles.bg)} as the background, with ${col(roles.primary)} and ${col(roles.secondary)} on key elements, and ${col(roles.accent)} as the single accent for highlights. Text in ${col(roles.text)} (${roles.ratio.toFixed(1)}:1 contrast).`,
        )] },
        { ...typeSec, lines: [
          headline
            ? t(`Integra el titular exacto "${headline}" en tipografía ${fontCharacter(h1?.family ?? 'Inter', t)} (${h1?.family ?? 'Inter'}, ${weightName(h1?.weight ?? 700, t)})${cta ? ` y un botón con el texto "${cta}"` : ''}.`, `Integrate the exact headline "${headline}" in ${fontCharacter(h1?.family ?? 'Inter', t)} typography (${h1?.family ?? 'Inter'}, ${weightName(h1?.weight ?? 700, t)})${cta ? ` and a button reading "${cta}"` : ''}.`)
            : t('No renderices texto: deja espacio limpio para añadir titular y CTA después.', 'Do not render text: leave clean space to add the headline and CTA later.'),
          ...layoutLines(cfg.ratio, cfg.logoPos, t),
        ] },
        { ...mustSec, id: 'musthave', lines: [t(`Debe incluir: ${must.join('; ') || 'jerarquía visual clara'}.`, `Must include: ${must.join('; ') || 'clear visual hierarchy'}.`)] },
        { ...restrSec, lines: [t(`Restricciones de estilo (Negative prompt): ${negItems.slice(0, ban.length + 1).join('; ')}. No inventes logotipos: reserva el espacio para el logo real.`, `Style constraints (Negative prompt): ${negItems.slice(0, ban.length + 1).join('; ')}. Do not invent logos: reserve the space for the real logo.`)] },
      ]
      params.model = 'Imagen 3'
      break
    }
    case 'ideogram-flujo': {
      render = 'plain'
      const fontDesc = `${fontCharacter(h1?.family ?? 'Inter', t)}, ${weightName(h1?.weight ?? 700, t)}`
      const style = tags.map((x) => x.label).join(', ') || t('diseño gráfico limpio', 'clean graphic design')
      sections = [
        { ...brandSec, lines: [t(
          `${pieceName} de diseño gráfico para ${brand.name}, ${cfg.ratio}, estilo ${style}, tema: ${topic}.`,
          `Graphic design ${pieceName} for ${brand.name}, ${cfg.ratio}, ${style} style, topic: ${topic}.`,
        )] },
        { ...contentSec, lines: [
          headline ? t(`Texto principal exacto, centrado en la jerarquía: "${headline}" en tipografía ${fontDesc}.`, `Exact main text, top of the hierarchy: "${headline}" in ${fontDesc} typography.`) : t('Sin texto principal.', 'No main text.'),
          ...(cta ? [t(`Botón con el texto exacto "${cta}" en color ${roles.accent.hex}.`, `Button with the exact text "${cta}" in ${roles.accent.hex}.`)] : []),
          ...(socials[0] ? [t(`Texto pequeño inferior: "${socials[0].handle}".`, `Small footer text: "${socials[0].handle}".`)] : []),
        ] },
        { ...paletteSec, lines: [t(
          `Colores exactos: fondo ${roles.bg.hex}, texto ${roles.text.hex}, formas ${roles.primary.hex} y ${roles.secondary.hex}, acento ${roles.accent.hex}. Alto contraste, legible.`,
          `Exact colors: background ${roles.bg.hex}, text ${roles.text.hex}, shapes ${roles.primary.hex} and ${roles.secondary.hex}, accent ${roles.accent.hex}. High contrast, legible.`,
        )] },
        { ...typeSec, lines: layoutLines(cfg.ratio, cfg.logoPos, t) },
        { ...restrSec, lines: [t(`Negative prompt (elementos a evitar): ${negItems.join(', ')}.`, `Negative prompt (elements to avoid): ${negItems.join(', ')}.`)] },
      ]
      params.magic_prompt = 'OFF'
      break
    }
    case 'midjourney': {
      render = 'plain'
      const style = tags.map((x) => x.label).join(', ')
      const stylize = tags.some((x) => ['luxury', 'editorial', 'futuristic'].includes(x.label.toLowerCase())) ? 250 : tags.some((x) => ['minimalist', 'corporate'].includes(x.label.toLowerCase())) ? 100 : 150
      const noList = negItems.filter((x) => !x.toLowerCase().includes('logo')).map((x) => x.replace(/^(do not|no) /i, '')).join(', ')
      const mjHead = headline ? `, bold typographic headline reading "${headline}"` : ', clean negative space for typography'
      const line = `${pieceName}, ${brand.name} brand graphic design, ${style ? style + ' style, ' : ''}${topic}${mjHead}, dominant background ${roles.bg.name} ${roles.bg.hex}, primary ${roles.primary.name} ${roles.primary.hex}, secondary ${roles.secondary.name} ${roles.secondary.hex}, accent ${roles.accent.name} ${roles.accent.hex}, ${fontCharacter(h1?.family ?? 'Inter', mk('en'))} typography, ${dark ? 'low-key moody lighting' : 'soft diffused light'}, clean empty safe zone at ${posL.en} for logo, balanced grid layout, professional graphic design, high contrast`
      sections = [{ id: 'content', title: 'Prompt', lines: [line] }]
      params.stylize = stylize
      params.v = '6.1'
      params.no = noList
      outro = `--ar ${cfg.ratio} --stylize ${stylize} --v 6.1 --no ${noList}`
      break
    }
    case 'system-context': {
      intro = t(
        `Eres el asistente creativo oficial de la marca ${brand.name}. Memoriza este ADN de marca y aplícalo SIEMPRE en cualquier campaña, copy o idea de diseño que te pida.`,
        `You are the official creative assistant for the brand ${brand.name}. Memorize this brand DNA and ALWAYS apply it to any campaign, copy or design idea I ask for.`,
      )
      const logoRules = [
        t('Versión del logo: principal sobre fondos claros; monocromática clara sobre fondos oscuros.', 'Logo version: main on light backgrounds; light monochrome on dark backgrounds.'),
        t(`Zona de seguridad: deja libre un margen igual a la altura del isotipo. Usos prohibidos: ${LOGO_MISUSE(t).join('; ')}.`, `Clearspace: keep a margin equal to the icon-mark height. Forbidden uses: ${LOGO_MISUSE(t).join('; ')}.`),
      ]
      sections = [
        { ...brandSec, lines: [...brandSec.lines, ...(brand.vision ? [`${t('Visión', 'Vision')}: ${brand.vision}`] : [])] },
        { ...paletteSec, lines: [...colors.map((c) => `${c.name} (${c.category}): ${c.hex} · ${rgbStr(c.hex)}`), ...paletteLines.slice(0, 5)] },
        { ...typeSec, lines: typeStyles.map((s) => `${s.role.toUpperCase()}: ${s.family} ${s.weight}, ${px(s)}px, ${t('interlineado', 'line-height')} ${s.lineHeight}`) },
        { id: 'content', title: t('Logo y presencia digital', 'Logo & digital presence'), lines: [...logoRules, `${t('Redes', 'Social')}: ${handles(socials, t)}`, ...(logos.length ? [`${t('Versiones disponibles', 'Available versions')}: ${Array.from(new Set(logos.map((l) => l.kind))).join(', ')}`] : [])] },
        { ...mustSec, lines: mustSec.lines.slice(0, Math.max(1, must.length)) },
        restrSec,
      ]
      outro = t(
        'Cuando te pida piezas, responde con propuestas coherentes con este ADN y señala cualquier conflicto con las reglas. Responde en español salvo que indique lo contrario.',
        'When I ask for pieces, answer with proposals consistent with this DNA and flag any conflict with the rules. Reply in English unless I say otherwise.',
      )
      break
    }
  }

  const body2 = sections
    .map((s) => (render === 'titled' ? `## ${s.title}\n${s.lines.map((l) => (/^[✔✘]/.test(l) ? l : `- ${l}`)).join('\n')}` : s.lines.join(' ')))
    .join(render === 'titled' ? '\n\n' : '\n\n')
  const prompt = cfg.platform === 'midjourney'
    ? `${sections[0].lines[0]} ${outro}`
    : [intro, body2, outro].filter(Boolean).join('\n\n')

  /* ───── Checklist de verificación ───── */
  const logoVersion = dark
    ? t('Monocromo Claro / Secundario', 'Light Monochrome / Secondary')
    : t('Principal / Monocromo Oscuro', 'Main / Dark Monochrome')
  const checklist = [
    t(`Verifica que el botón CTA use el color de acento ${roles.accent.hex} (${roles.accent.name}).`, `Check that the CTA button uses the accent color ${roles.accent.hex} (${roles.accent.name}).`),
    t(`Inserta tu logo versión ${logoVersion} en ${posName} usando el Estudio de Edición.`, `Insert your ${logoVersion} logo at the ${posName} using the Editing Studio.`),
    t(`Comprueba el par fondo/texto ${roles.bg.hex} / ${roles.text.hex}: ${roles.ratio.toFixed(2)}:1 (${roles.level}).`, `Check the background/text pair ${roles.bg.hex} / ${roles.text.hex}: ${roles.ratio.toFixed(2)}:1 (${roles.level}).`),
    t(`Sustituye las fuentes generadas por ${h1?.family ?? 'Inter'} (títulos) y ${body?.family ?? 'Inter'} (cuerpo) en el Estudio si la IA no las respetó.`, `Replace generated fonts with ${h1?.family ?? 'Inter'} (headlines) and ${body?.family ?? 'Inter'} (body) in the Studio if the AI did not respect them.`),
    ...(headline ? [t(`Revisa la ortografía exacta del titular: "${headline}".`, `Proofread the exact headline: "${headline}".`)] : []),
    ...(cta ? [t(`Confirma que el CTA diga exactamente "${cta}".`, `Confirm the CTA reads exactly "${cta}".`)] : []),
    t(`Confirma que aparezca el pie con ${handles(socials, t)}.`, `Confirm the footer shows ${handles(socials, t)}.`),
    ...must.map((m) => t(`Verifica: ${m}.`, `Check: ${m}.`)),
    ...ban.map((b) => t(`Confirma que NO ocurre: ${b}.`, `Confirm this did NOT happen: ${b}.`)),
    t(`Exporta a ${size.w}×${size.h}px (${cfg.ratio}).`, `Export at ${size.w}×${size.h}px (${cfg.ratio}).`),
  ]

  return { prompt, sections, negative, checklist, params, roles, langUsed: lang, size: { w: size.w, h: size.h } }
}

export function defaultConfig(platform: PlatformId = 'chatgpt-canva'): PieceConfig {
  return { platform, pieceType: 'flyer', ratio: '4:5', topic: '', headline: '', cta: '', logoPos: 'tr', lang: 'es' }
}
