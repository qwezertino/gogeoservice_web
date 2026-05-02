import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { BBox4326 } from '../../types'

interface MapBoundsCaptureProps {
  onBoundsChange: (bbox: BBox4326) => void
}

/**
 * Компонент без рендера — слушает движение карты и сообщает текущий viewport
 * в WGS-84. Должен быть размещён внутри MapContainer.
 */
export function MapBoundsCapture({ onBoundsChange }: MapBoundsCaptureProps) {
  const map = useMap()
  const cbRef = useRef(onBoundsChange)
  cbRef.current = onBoundsChange

  useEffect(() => {
    const update = () => {
      const b = map.getBounds()
      cbRef.current({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
      })
    }
    update() // сразу при монтировании
    map.on('moveend', update)
    return () => { map.off('moveend', update) }
  }, [map])

  return null
}
