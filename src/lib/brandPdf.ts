import { db } from '../db/brandDb'
import { colorFormats, readableOn, contrastRatio, wcagLevel } from './color'
import { blobToDataUrl } from './files'
import { registerBrandFonts, ROLE_LABELS } from './fonts'
import { LOGO_KINDS } from '../views/Logos'
import { netById } from './networks'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const W = 794, H = 1123

/** Genera el manual de marca en PDF (A4) renderizando páginas HTML con las fuentes de la marca. */
export async function buildBrandGuidelinesPdf(brandId: number): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  const brand = (await db.brands.get(brandId))!
  const [colors, styles, logos, socials] = await Promise.all([
    db.colors.where('brandId').equals(brandId).sortBy('order'),
    db.typeStyles.where('brandId').equals(brandId).toArray(),
    db.logos.where('brandId').equals(brandId).toArray(),
    db.socials.where('brandId').equals(brandId).toArray(),
  ])
  await registerBrandFonts(brandId)
  const fam = (role: string) => `'${styles.find((s) => s.role === role)?.family ?? 'Inter'}'`
  const primary = colors[0]?.hex ?? '#111827'
  const cream = colors[1]?.hex ?? '#f8fafc'
  const logoUrls = await Promise.all(logos.map(async (l) => ({ ...l, url: await blobToDataUrl(l.blob) })))
  const main = logoUrls.find((l) => l.kind === 'main') ?? logoUrls[0]
  const light = logoUrls.find((l) => l.kind === 'secondary') ?? main

  try { await document.fonts.ready } catch { /* noop */ }

  const page = (inner: string, bg = '#ffffff', fg = '#111827') =>
    `<section style="width:${W}px;height:${H}px;padding:64px;box-sizing:border-box;background:${bg};color:${fg};font-family:${fam('body')},sans-serif;position:relative;overflow:hidden">${inner}
     <div style="position:absolute;bottom:28px;left:64px;right:64px;display:flex;justify-content:space-between;font-size:11px;opacity:.5"><span>${esc(brand.name)} · Manual de marca</span><span>BrandKit Studio</span></div></section>`
  const h2 = (t: string) => `<h2 style="font-family:${fam('h2')},sans-serif;font-size:34px;margin:0 0 28px;font-weight:700">${t}</h2>`

  const pages: string[] = []

  pages.push(page(`
    <div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:28px">
      ${light ? `<img src="${light.url}" style="max-width:420px;max-height:200px"/>` : ''}
      <h1 style="font-family:${fam('h1')},sans-serif;font-size:56px;margin:0;font-weight:700">${esc(brand.name)}</h1>
      <p style="font-size:20px;opacity:.85;margin:0">${esc(brand.tagline)}</p>
      <div style="margin-top:40px;letter-spacing:.3em;font-size:12px;text-transform:uppercase;opacity:.7">Manual de identidad de marca</div>
    </div>`, primary, readableOn(primary)))

  pages.push(page(`
    ${h2('Identidad')}
    ${([['Misión', brand.mission], ['Visión', brand.vision], ['Tono de voz', brand.voice]] as const).map(([k, v]) =>
      `<div style="margin-bottom:28px"><div style="font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:${colors[2]?.hex ?? primary};font-weight:700;margin-bottom:6px">${k}</div>
       <p style="font-size:16px;line-height:1.6;margin:0">${esc(v || '—')}</p></div>`).join('')}
    ${main ? `<div style="margin-top:60px;background:${cream};border-radius:20px;padding:40px;text-align:center"><img src="${main.url}" style="max-width:380px;max-height:140px"/></div>` : ''}`))

  pages.push(page(`
    ${h2('Paleta de color')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    ${colors.slice(0, 12).map((c) => {
      const f = colorFormats(c.hex)
      return `<div style="border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="height:80px;background:${c.hex};color:${readableOn(c.hex)};padding:12px;font-weight:700">${esc(c.name)}</div>
        <div style="padding:10px 12px;font-size:11px;line-height:1.6;font-family:monospace">${f.HEX}<br/>${f.RGB}<br/>${f.HSL}<br/>${f.CMYK}</div></div>`
    }).join('')}</div>`))

  const pairs = colors.slice(0, 6).flatMap((a) => colors.slice(0, 6).filter((b) => b.id !== a.id).map((b) => ({ a, b, r: contrastRatio(a.hex, b.hex) }))).filter((p) => p.r >= 4.5).slice(0, 8)
  pages.push(page(`
    ${h2('Tipografía')}
    ${styles.map((s) => `<div style="margin-bottom:22px;border-bottom:1px solid #e5e7eb;padding-bottom:14px">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin-bottom:4px">${ROLE_LABELS[s.role]} · ${esc(s.family)} · ${s.size}${s.unit} · ${s.weight} · ${s.lineHeight}</div>
      <div style="font-family:'${s.family}',sans-serif;font-size:${Math.min(s.unit === 'rem' ? s.size * 16 : s.size, 52)}px;font-weight:${s.weight};line-height:${s.lineHeight}">${s.role === 'body' ? 'El zorro marrón salta sobre el perro perezoso.' : esc(brand.name)}</div></div>`).join('')}
    ${pairs.length ? `<h3 style="margin:30px 0 12px">Combinaciones accesibles</h3><div style="display:flex;flex-wrap:wrap;gap:8px">${pairs.map((p) =>
      `<span style="background:${p.a.hex};color:${p.b.hex};padding:8px 14px;border-radius:10px;font-size:12px;font-weight:600">Aa · ${p.r.toFixed(1)} ${wcagLevel(p.r)}</span>`).join('')}</div>` : ''}`))

  pages.push(page(`
    ${h2('Logotipos')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    ${logoUrls.map((l) => {
      const dark = l.kind === 'secondary' || l.kind === 'monoLight'
      return `<div style="border-radius:16px;border:1px solid #e5e7eb;overflow:hidden"><div style="height:130px;display:grid;place-items:center;padding:16px;background:${dark ? primary : '#fff'}"><img src="${l.url}" style="max-width:90%;max-height:100px"/></div>
      <div style="padding:8px 12px;font-size:12px;color:#6b7280">${LOGO_KINDS.find((k) => k.id === l.kind)?.label ?? ''} · ${esc(l.name)}</div></div>`
    }).join('')}</div>
    ${socials.length ? `<h3 style="margin:28px 0 10px">Presencia digital</h3><div style="font-size:13px;line-height:1.9">${socials.map((s) => `<b>${esc(netById(s.network).name)}</b> — ${esc(s.handle)}`).join('<br/>')}</div>` : ''}`))

  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-${W + 200}px;top:0;z-index:-1`
  host.innerHTML = pages.join('')
  document.body.appendChild(host)
  try {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight()
    const nodes = Array.from(host.children) as HTMLElement[]
    for (let i = 0; i < nodes.length; i++) {
      const canvas = await html2canvas(nodes[i], { scale: 2, useCORS: true, backgroundColor: null })
      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph)
    }
    return pdf.output('blob')
  } finally {
    host.remove()
  }
}
