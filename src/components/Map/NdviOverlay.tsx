import { ImageOverlay } from 'react-leaflet'
import type { BBox3857 } from '../../types'
import { metersToLngLat } from '../../utils/projection'
import L from 'leaflet'

interface NdviOverlayProps {
  imageUrl: string
  bbox: BBox3857
  opacity: number
}

export function NdviOverlay({ imageUrl, bbox, opacity }: NdviOverlayProps) {
  const [swLng, swLat] = metersToLngLat(bbox.minX, bbox.minY)
  const [neLng, neLat] = metersToLngLat(bbox.maxX, bbox.maxY)
  const bounds = L.latLngBounds([swLat, swLng], [neLat, neLng])

  return (
    <ImageOverlay
      url={imageUrl}
      bounds={bounds}
      opacity={opacity}
      className="fade-in"
      zIndex={400}
    />
  )
}
