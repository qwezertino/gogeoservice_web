import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { BBox4326 } from '../../types'

/** Минимальный зум для загрузки каталога (примерно ~100км по ширине) */
export const CATALOG_MIN_ZOOM = 10

interface MapBoundsCaptureProps {
  onBoundsChange: (bbox: BBox4326 | null, zoom: number) => void
}

/**
 * Компонент без рендера — слушает движение карты и сообщает текущий viewport.
 * Если зум < CATALOG_MIN_ZOOM — передаёт bbox=null.
 */
export function MapBoundsCapture({ onBoundsChange }: MapBoundsCaptureProps) {
  const map = useMap()
  const cbRef = useRef(onBoundsChange)
  cbRef.current = onBoundsChange

  useEffect(() => {
    const update = () => {
      const zoom = map.getZoom()
      if (zoom < CATALOG_MIN_ZOOM) {
        cbRef.current(null, zoom)
        return
      }
      const b = map.getBounds()
      cbRef.current({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      }, zoom)
    }
    update()
    map.on('moveend', update)
    return () => { map.off('moveend', update) }
  }, [map])

  return null
}
