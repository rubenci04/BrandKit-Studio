export interface RGB { r: number; g: number; b: number }

export function normalizeHex(input: string): string | null {
  let h = input.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(h) ? '#' + h.toUpperCase() : null
}

export function hexToRgb(hex: string): RGB {
  const h = (normalizeHex(hex) ?? '#000000').slice(1)
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}

export function rgbToHsl({ r, g, b }: RGB) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  const d = max - min
  let h = 0, s = 0
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0)
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h *= 60
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function rgbToCmyk({ r, g, b }: RGB) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const k = 1 - Math.max(rr, gg, bb)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: Math.round(((1 - rr - k) / (1 - k)) * 100),
    m: Math.round(((1 - gg - k) / (1 - k)) * 100),
    y: Math.round(((1 - bb - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  }
}

export function colorFormats(hex: string) {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb)
  const cmyk = rgbToCmyk(rgb)
  return {
    HEX: (normalizeHex(hex) ?? hex).toUpperCase(),
    RGB: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    HSL: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    CMYK: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
  }
}

/** Luminancia relativa WCAG 2.1 */
export function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrastRatio(a: string, b: string) {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fallo'
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large'
  return 'Fallo'
}

/** Color de texto legible (blanco/negro) sobre un fondo. */
export function readableOn(hex: string) {
  return contrastRatio(hex, '#000000') > contrastRatio(hex, '#FFFFFF') ? '#000000' : '#FFFFFF'
}

/** Integración opcional con TheColorAPI (requiere conexión). */
export async function fetchColorName(hex: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.thecolorapi.com/id?hex=${hex.replace('#', '')}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.name?.value ?? null
  } catch {
    return null
  }
}
