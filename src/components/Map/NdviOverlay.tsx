import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { BBox3857 } from '../../types'
import { metersToLngLat } from '../../utils/projection'

interface NdviOverlayProps {
  imageUrl: string
  bbox: BBox3857
  opacity: number
}

export function NdviOverlay({ imageUrl, bbox, opacity }: NdviOverlayProps) {
  const map = useMap()
  const layerRef = useRef<L.ImageOverlay | null>(null)

  const [swLng, swLat] = metersToLngLat(bbox.minX, bbox.minY)
  const [neLng, neLat] = metersToLngLat(bbox.maxX, bbox.maxY)
  const bounds = L.latLngBounds([swLat, swLng], [neLat, neLng])

  // Создаём/пересоздаём слой при смене изображения или bounds
  useEffect(() => {
    const layer = L.imageOverlay(imageUrl, bounds, { opacity, zIndex: 400 })
    layer.addTo(map)
    layerRef.current = layer

    return () => {
      layer.remove()
      layerRef.current = null
    }
    // bounds и imageUrl — пересоздаём слой только при их смене
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, imageUrl])

  // Обновляем opacity без пересоздания слоя
  useEffect(() => {
    layerRef.current?.setOpacity(opacity)
  }, [opacity])

  return null
}

