import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import type { LatLng } from 'leaflet'
import { validationErrorText } from '../../utils/validation'
import type { DrawnZone } from '../../hooks/useDrawnZone'

interface DrawControlProps {
  zone: DrawnZone | null
  onZoneChange: (points: LatLng[]) => void
}

export function DrawControl({ zone, onZoneChange }: DrawControlProps) {
  const map = useMap()
  const layerRef = useRef<L.Layer | null>(null)

  useEffect(() => {
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
      rotateMode: false,
    })

    map.pm.setGlobalOptions({ continueDrawing: false })

    const handleCreate = (e: { layer: L.Layer }) => {
      // Удаляем предыдущий слой
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
      layerRef.current = e.layer

      const poly = e.layer as L.Polygon
      const latlngs = (poly.getLatLngs()[0] as L.LatLng[])
      onZoneChange(latlngs)
    }

    map.on('pm:create', handleCreate)
    return () => {
      map.off('pm:create', handleCreate)
      map.pm.removeControls()
    }
  }, [map, onZoneChange])

  // Обновляем стиль слоя при изменении валидации
  useEffect(() => {
    if (!layerRef.current || !(layerRef.current instanceof L.Polygon)) return
    const poly = layerRef.current as L.Polygon

    if (!zone) {
      poly.setStyle({ color: '#6b7280', fillColor: '#6b7280' })
      return
    }

    if (zone.validation.valid) {
      poly.setStyle({ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.15 })
      poly.unbindTooltip()
    } else {
      poly.setStyle({ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.2 })
      poly.bindTooltip(validationErrorText(zone.validation.error), {
        permanent: true,
        direction: 'center',
        className: 'validation-tooltip',
      }).openTooltip()
    }
  }, [zone])

  return null
}
