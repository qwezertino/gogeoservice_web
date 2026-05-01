import { useState, useCallback } from 'react'
import type { LatLng } from 'leaflet'
import type { BBox3857, ZoneValidation } from '../types'
import { lngLatToMeters } from '../utils/projection'
import { validateBBox } from '../utils/validation'

export interface DrawnZone {
  bbox: BBox3857
  points: LatLng[]
  validation: ZoneValidation
  /** центр bbox в WGS84 */
  centerLng: number
  centerLat: number
}

export function useDrawnZone() {
  const [zone, setZone] = useState<DrawnZone | null>(null)

  const setPoints = useCallback((points: LatLng[]) => {
    if (points.length < 3) {
      const bbox: BBox3857 = { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      setZone({
        bbox,
        points,
        validation: validateBBox(bbox, points.length),
        centerLng: 0,
        centerLat: 0,
      })
      return
    }

    const projected = points.map(p => lngLatToMeters(p.lng, p.lat))
    const xs = projected.map(p => p[0])
    const ys = projected.map(p => p[1])
    const bbox: BBox3857 = {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    }
    const validation = validateBBox(bbox, points.length)

    const lngs = points.map(p => p.lng)
    const lats = points.map(p => p.lat)
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

    setZone({ bbox, points, validation, centerLng, centerLat })
  }, [])

  const clear = useCallback(() => setZone(null), [])

  return { zone, setPoints, clear }
}
