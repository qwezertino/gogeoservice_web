import { metersToLngLat } from './projection'
import type { BBox3857 } from '../types'

/**
 * Compute the 4 corner coordinates of a bbox image overlay,
 * in the order MapLibre image-source expects: [NW, NE, SE, SW] (clockwise).
 *
 * This is the single source of truth used both when ADDING the image source
 * and when computing snap targets — guaranteeing they are identical.
 */
export function imageOverlayCorners(
  bbox: BBox3857,
): [[number, number], [number, number], [number, number], [number, number]] {
  const [swLng, swLat] = metersToLngLat(bbox.minX, bbox.minY) // SW: min-lng, min-lat
  const [neLng, neLat] = metersToLngLat(bbox.maxX, bbox.maxY) // NE: max-lng, max-lat
  return [
    [swLng, neLat], // NW  (top-left)
    [neLng, neLat], // NE  (top-right)
    [neLng, swLat], // SE  (bottom-right)
    [swLng, swLat], // SW  (bottom-left)
  ]
}
