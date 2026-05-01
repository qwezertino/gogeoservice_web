import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { BBox3857 } from '../../types'
import { metersToLngLat } from '../../utils/projection'

export interface FlyToTarget {
  bbox: BBox3857
  seq: number  // меняется при каждом клике, даже для того же bbox
}

interface FlyToControllerProps {
  target: FlyToTarget | null
}

export function FlyToController({ target }: FlyToControllerProps) {
  const map = useMap()
  const prevSeq = useRef<number>(-1)

  useEffect(() => {
    if (!target || target.seq === prevSeq.current) return
    prevSeq.current = target.seq

    const [swLng, swLat] = metersToLngLat(target.bbox.minX, target.bbox.minY)
    const [neLng, neLat] = metersToLngLat(target.bbox.maxX, target.bbox.maxY)
    map.flyToBounds(L.latLngBounds([swLat, swLng], [neLat, neLng]), {
      padding: [60, 60],
      duration: 0.8,
    })
  }, [target, map])

  return null
}
