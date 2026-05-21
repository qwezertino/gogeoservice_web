import { lngLatToMeters } from './projection'
import type { BBox3857 } from '../types'

const MAX_DIM = 512

/** Computes image tile pixel dimensions from bbox — must match server logic exactly. */
export function calcTileSize(bbox: BBox3857): { w: number; h: number } {
  const widthM = bbox.maxX - bbox.minX
  const heightM = bbox.maxY - bbox.minY
  const aspect = widthM / heightM
  if (aspect >= 1) {
    return { w: MAX_DIM, h: Math.max(1, Math.round(MAX_DIM / aspect)) }
  } else {
    return { h: MAX_DIM, w: Math.max(1, Math.round(MAX_DIM * aspect)) }
  }
}

/** Fetches raw float32 NDVI grid for a tile. Returns null if unavailable (404 / network error). */
export async function fetchNdviRaw(minioKey: string): Promise<Float32Array | null> {
  try {
    const res = await fetch(`/api/ndvi-raw?key=${encodeURIComponent(minioKey)}`)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return new Float32Array(buffer)
  } catch {
    return null
  }
}

/**
 * Returns NDVI value at a geographic point, or null if outside the tile.
 * Y axis is flipped: map Y (latitude) increases upward, image row index increases downward.
 */
export function sampleNdviAt(
  data: Float32Array,
  bbox: BBox3857,
  w: number,
  h: number,
  lng: number,
  lat: number,
): number | null {
  const [mx, my] = lngLatToMeters(lng, lat)
  if (mx < bbox.minX || mx > bbox.maxX || my < bbox.minY || my > bbox.maxY) return null

  const px = Math.floor((mx - bbox.minX) / (bbox.maxX - bbox.minX) * w)
  const py = Math.floor((bbox.maxY - my) / (bbox.maxY - bbox.minY) * h)

  const x = Math.max(0, Math.min(w - 1, px))
  const y = Math.max(0, Math.min(h - 1, py))

  return data[y * w + x]
}

export function ndviToLabel(value: number): string {
  if (value < 0.05) return 'Нет растительности'
  return `NDVI: ${value.toFixed(3)}`
}
