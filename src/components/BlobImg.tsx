import { useBlobUrl } from '../lib/files'

export function BlobImg({ blob, alt = '', className, style }: { blob?: Blob | null; alt?: string; className?: string; style?: React.CSSProperties }) {
  const url = useBlobUrl(blob)
  if (!url) return null
  return <img src={url} alt={alt} className={className} style={style} draggable={false} />
}
