export interface NetworkInfo {
  id: string
  name: string
  short: string
  color: string
  urlBase: string
  sizes: { label: string; size: string }[]
}

export const NETWORKS: NetworkInfo[] = [
  { id: 'instagram', name: 'Instagram', short: 'IG', color: '#E1306C', urlBase: 'https://instagram.com/', sizes: [
    { label: 'Foto de perfil', size: '320 × 320 px' }, { label: 'Post cuadrado', size: '1080 × 1080 px' },
    { label: 'Post vertical', size: '1080 × 1350 px' }, { label: 'Historia / Reel', size: '1080 × 1920 px' }] },
  { id: 'tiktok', name: 'TikTok', short: 'TT', color: '#25F4EE', urlBase: 'https://tiktok.com/@', sizes: [
    { label: 'Foto de perfil', size: '200 × 200 px' }, { label: 'Video', size: '1080 × 1920 px' }] },
  { id: 'x', name: 'X (Twitter)', short: 'X', color: '#1d9bf0', urlBase: 'https://x.com/', sizes: [
    { label: 'Foto de perfil', size: '400 × 400 px' }, { label: 'Cabecera', size: '1500 × 500 px' }, { label: 'Imagen de post', size: '1600 × 900 px' }] },
  { id: 'youtube', name: 'YouTube', short: 'YT', color: '#FF0000', urlBase: 'https://youtube.com/@', sizes: [
    { label: 'Foto de perfil', size: '800 × 800 px' }, { label: 'Banner del canal', size: '2560 × 1440 px' }, { label: 'Miniatura', size: '1280 × 720 px' }] },
  { id: 'linkedin', name: 'LinkedIn', short: 'in', color: '#0A66C2', urlBase: 'https://linkedin.com/company/', sizes: [
    { label: 'Logo de empresa', size: '300 × 300 px' }, { label: 'Banner', size: '1128 × 191 px' }, { label: 'Post', size: '1200 × 627 px' }] },
  { id: 'facebook', name: 'Facebook', short: 'f', color: '#1877F2', urlBase: 'https://facebook.com/', sizes: [
    { label: 'Foto de perfil', size: '320 × 320 px' }, { label: 'Portada', size: '820 × 312 px' }, { label: 'Post', size: '1200 × 630 px' }] },
  { id: 'whatsapp', name: 'WhatsApp Business', short: 'WA', color: '#25D366', urlBase: 'https://wa.me/', sizes: [
    { label: 'Foto de perfil', size: '640 × 640 px' }, { label: 'Catálogo', size: '1024 × 1024 px' }] },
  { id: 'web', name: 'Sitio web', short: 'www', color: '#8b5cf6', urlBase: 'https://', sizes: [
    { label: 'Open Graph', size: '1200 × 630 px' }, { label: 'Favicon', size: '512 × 512 px' }] },
  { id: 'pinterest', name: 'Pinterest', short: 'P', color: '#E60023', urlBase: 'https://pinterest.com/', sizes: [
    { label: 'Foto de perfil', size: '165 × 165 px' }, { label: 'Pin', size: '1000 × 1500 px' }] },
  { id: 'telegram', name: 'Telegram', short: 'TG', color: '#229ED9', urlBase: 'https://t.me/', sizes: [
    { label: 'Foto de perfil', size: '512 × 512 px' }] },
]

export const netById = (id: string) => NETWORKS.find((n) => n.id === id) ?? { id, name: id, short: id.slice(0, 2).toUpperCase(), color: '#64748b', urlBase: '', sizes: [] }

export const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  reserved: { label: 'Reservado', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  available: { label: 'Disponible', cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  unavailable: { label: 'No disponible', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
}

export function NetBadge({ id, size = 36 }: { id: string; size?: number }) {
  const n = netById(id)
  return (
    <span className="inline-grid place-items-center rounded-xl font-bold text-white shrink-0 select-none"
      style={{ width: size, height: size, background: n.color, fontSize: size * 0.34, textShadow: '0 1px 2px rgba(0,0,0,.35)' }}>
      {n.short}
    </span>
  )
}
