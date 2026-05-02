import type { BBox4326, BBox3857, TileRecord } from '../types'

/** Запрашивает список закэшированных NDVI-тайлов за год в пределах bbox (WGS-84). */
export async function fetchCatalog(year: number, bbox: BBox4326): Promise<TileRecord[]> {
  const bboxStr = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`
  const url = `/api/catalog?year=${year}&bbox=${bboxStr}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`catalog ${res.status}`)
  return res.json()
}

export interface RenderedTile {
  bbox: BBox3857
  date: string
  blobUrl: string
  minioKey: string
}

const BATCH_SIZE = 100

/**
 * Запрашивает PNG-изображения для переданных тайлов через /api/render/batch.
 * Так как все тайлы уже в кэше — ответ приходит быстро.
 * Возвращает blob URL-ы (нужно revoke при удалении).
 */
export async function renderCatalogTiles(
  tiles: TileRecord[],
  onProgress?: (done: number, total: number) => void,
): Promise<RenderedTile[]> {
  const results: RenderedTile[] = []

  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const chunk = tiles.slice(i, i + BATCH_SIZE)

    const batchBody = chunk.map(t => ({
      bbox: [t.bbox_minx, t.bbox_miny, t.bbox_maxx, t.bbox_maxy],
      date: t.date_acquired,
      index: 'ndvi',
      w: t.width,
      h: t.height,
    }))

    const res = await fetch('/api/render/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchBody),
    })
    if (!res.ok) throw new Error(`batch ${res.status}`)

    const batchResults: { index: number; data?: string; error?: string }[] = await res.json()

    for (let j = 0; j < chunk.length; j++) {
      const r = batchResults[j]
      if (!r.data) continue

      const binary = atob(r.data)
      const arr = new Uint8Array(binary.length)
      for (let k = 0; k < binary.length; k++) arr[k] = binary.charCodeAt(k)
      const blob = new Blob([arr], { type: 'image/png' })

      const t = chunk[j]
      results.push({
        bbox: { minX: t.bbox_minx, minY: t.bbox_miny, maxX: t.bbox_maxx, maxY: t.bbox_maxy },
        date: t.date_acquired,
        blobUrl: URL.createObjectURL(blob),
        minioKey: t.minio_key,
      })
    }

    onProgress?.(Math.min(i + BATCH_SIZE, tiles.length), tiles.length)
  }

  return results
}

/** Удаляет тайл из MinIO и tile_cache по ключу. */
export async function deleteTile(minioKey: string): Promise<void> {
  const res = await fetch(`/api/tiles?key=${encodeURIComponent(minioKey)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`delete tile ${res.status}`)
}
