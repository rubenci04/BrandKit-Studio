import { db } from '../db/brandDb'

export const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
  'Merriweather', 'Ubuntu', 'Rubik', 'Work Sans', 'Quicksand', 'Karla', 'DM Sans', 'DM Serif Display', 'Manrope',
  'Space Grotesk', 'Bebas Neue', 'Lora', 'PT Serif', 'Cabin', 'Barlow', 'Josefin Sans', 'Fira Sans', 'Archivo',
  'Cormorant Garamond', 'Libre Baskerville', 'Abril Fatface', 'Pacifico', 'Lobster', 'Dancing Script', 'Caveat',
  'Anton', 'Outfit', 'Sora', 'Lexend', 'Urbanist', 'Plus Jakarta Sans', 'Bitter', 'Crimson Text', 'Source Sans 3',
  'Noto Sans', 'Titillium Web', 'Exo 2', 'Righteous', 'Fredoka', 'Syne',
]

const loadedGoogle = new Set<string>()
const loadedLocal = new Set<string>()

export function loadGoogleFont(family: string) {
  if (loadedGoogle.has(family) || typeof document === 'undefined') return
  loadedGoogle.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap`
  document.head.appendChild(link)
}

export async function loadLocalFont(family: string, blob: Blob) {
  const key = `${family}:${blob.size}`
  if (loadedLocal.has(key)) return
  const buf = await blob.arrayBuffer()
  const face = new FontFace(family, buf)
  await face.load()
  document.fonts.add(face)
  loadedLocal.add(key)
}

/** Registra todas las fuentes (Google + locales) de una marca en el documento. */
export async function registerBrandFonts(brandId: number) {
  const fonts = await db.fonts.where('brandId').equals(brandId).toArray()
  for (const f of fonts) {
    if (f.source === 'google') loadGoogleFont(f.family)
    else if (f.blob) {
      try { await loadLocalFont(f.family, f.blob) } catch (e) { console.warn('No se pudo cargar la fuente', f.family, e) }
    }
  }
  return fonts
}

export const ROLE_LABELS: Record<string, string> = {
  h1: 'Título H1', h2: 'Título H2', h3: 'Título H3', body: 'Cuerpo', button: 'Botones', note: 'Notas',
}
