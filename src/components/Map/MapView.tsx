import { useRef, useEffect, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEFAULT_BASEMAP, CATALOG_MIN_ZOOM } from '../../config'
import { metersToLngLat, lngLatToMeters } from '../../utils/projection'
import { validationErrorText } from '../../utils/validation'
import { Spinner } from '../ui/Spinner'
import type { BBox4326, Snapshot, LngLat, FlyToTarget } from '../../types'
import type { DrawnZone } from '../../hooks/useDrawnZone'

// ---- Source / Layer IDs ----
const LYR_OSM   = 'lyr-osm'
const LYR_ESRI  = 'lyr-esri'
const SRC_ZONE  = 'src-zone'
const LYR_ZONE_FILL = 'lyr-zone-fill'
const LYR_ZONE_LINE = 'lyr-zone-line'
const SRC_DRAW  = 'src-draw'
const LYR_DRAW_LINE  = 'lyr-draw-line'
const LYR_DRAW_VERTS = 'lyr-draw-verts'
const SRC_SNAP  = 'src-snap'
const LYR_SNAP  = 'lyr-snap'
const SNAP_RADIUS_PX = 20

// ---- Pure helpers ----

/** Returns the first vertex if cursor is within SNAP_RADIUS_PX of it (to close the polygon), or null. */
function findSnapTarget(
  map: maplibregl.Map,
  cursor: [number, number],
  verts: [number, number][],
): [number, number] | null {
  if (verts.length < 3) return null
  const cp = map.project(cursor as maplibregl.LngLatLike)
  const fp = map.project(verts[0] as maplibregl.LngLatLike)
  const d = Math.hypot(fp.x - cp.x, fp.y - cp.y)
  return d < SNAP_RADIUS_PX ? verts[0] : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeDrawData(verts: [number, number][], preview?: [number, number]): any {
  const features = []
  const pts = preview ? [...verts, preview] : verts
  if (pts.length >= 2) {
    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pts }, properties: {} })
  }
  if (verts.length > 0) {
    features.push({ type: 'Feature', geometry: { type: 'MultiPoint', coordinates: verts }, properties: {} })
  }
  return { type: 'FeatureCollection', features }
}

function makeZoneData(zone: DrawnZone | null) {
  if (!zone || zone.points.length < 3) return { type: 'FeatureCollection', features: [] }
  const color = zone.validation.valid ? '#22c55e' : '#ef4444'
  const ring = [...zone.points.map(p => [p.lng, p.lat]), [zone.points[0].lng, zone.points[0].lat]]
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: { color } }],
  }
}

// ---- Component ----

interface MapViewProps {
  zone: DrawnZone | null
  onZoneChange: (points: LngLat[]) => void
  snapshots: Snapshot[]
  activeSnapshotId: number | null
  onSelectSnapshot: (id: number) => void
  ndviOpacity: number
  loading: boolean
  flyToTarget: FlyToTarget | null
  onBoundsChange: (bbox: BBox4326 | null, zoom: number) => void
}

export function MapView({
  zone, onZoneChange, snapshots, activeSnapshotId, onSelectSnapshot,
  ndviOpacity, loading, flyToTarget, onBoundsChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [basemap, setBasemap] = useState(DEFAULT_BASEMAP)
  const basemapRef = useRef(DEFAULT_BASEMAP)
  const [isDrawing, setIsDrawing] = useState(false)

  // Stable refs — updated every render, safe to read inside event handlers
  const drawVertsRef = useRef<[number, number][]>([])
  const isDrawingRef = useRef(false)
  const snapshotsRef = useRef(snapshots)
  const activeIdRef   = useRef(activeSnapshotId)
  const onZoneChangeRef    = useRef(onZoneChange)
  const onBoundsChangeRef  = useRef(onBoundsChange)
  const onSelectSnapshotRef = useRef(onSelectSnapshot)
  snapshotsRef.current = snapshots
  activeIdRef.current  = activeSnapshotId
  onZoneChangeRef.current   = onZoneChange
  onBoundsChangeRef.current = onBoundsChange
  onSelectSnapshotRef.current = onSelectSnapshot

  // NDVI overlay tracking: snapshotId → maskedImageUrl
  const addedSnapshotsRef = useRef<Map<number, string>>(new Map())
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const snapTargetRef = useRef<[number, number] | null>(null)

  // ---- Drawing callbacks (stable, no deps) ----

  const finishDrawing = useCallback((verts: [number, number][]) => {
    if (verts.length < 3) return
    const points = verts.map(([lng, lat]) => ({ lng, lat }))
    onZoneChangeRef.current(points)
    drawVertsRef.current = []
    isDrawingRef.current = false
    setIsDrawing(false)
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = ''
    map.doubleClickZoom.enable()
    // Update SRC_ZONE synchronously so the polygon appears immediately
    // (don't wait for React zone effect which may be blocked by isStyleLoaded)
    ;(map.getSource(SRC_DRAW) as maplibregl.GeoJSONSource)
      ?.setData({ type: 'FeatureCollection', features: [] })
    ;(map.getSource(SRC_SNAP) as maplibregl.GeoJSONSource)
      ?.setData({ type: 'FeatureCollection', features: [] })
    snapTargetRef.current = null
    const zoneSrc = map.getSource(SRC_ZONE) as maplibregl.GeoJSONSource
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zoneSrc?.setData(makeZoneData({ bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, points, validation: { valid: true, error: null, widthM: 0, heightM: 0 }, centerLng: 0, centerLat: 0 }) as any)
  }, [])

  const cancelDrawing = useCallback(() => {
    drawVertsRef.current = []
    isDrawingRef.current = false
    setIsDrawing(false)
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = ''
    map.doubleClickZoom.enable()
    ;(map.getSource(SRC_DRAW) as maplibregl.GeoJSONSource)
      ?.setData({ type: 'FeatureCollection', features: [] })
    ;(map.getSource(SRC_SNAP) as maplibregl.GeoJSONSource)
      ?.setData({ type: 'FeatureCollection', features: [] })
    snapTargetRef.current = null
  }, [])

  const startDrawing = useCallback(() => {
    isDrawingRef.current = true
    drawVertsRef.current = []
    setIsDrawing(true)
    onZoneChangeRef.current([])
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = 'crosshair'
    map.doubleClickZoom.disable()
  }, [])

  // Refs to stable callbacks for use inside the init useEffect closure
  const finishRef = useRef(finishDrawing)
  const cancelRef = useRef(cancelDrawing)
  finishRef.current = finishDrawing
  cancelRef.current = cancelDrawing

  // ---- Map init (runs once) ----

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'src-osm':  { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' },
          'src-esri': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Tiles © Esri' },
        },
        layers: [
          { id: LYR_OSM,  type: 'raster', source: 'src-osm',  layout: { visibility: DEFAULT_BASEMAP === 'osm'  ? 'visible' : 'none' } },
          { id: LYR_ESRI, type: 'raster', source: 'src-esri', layout: { visibility: DEFAULT_BASEMAP === 'esri' ? 'visible' : 'none' } },
        ],
      },
      center: [10, 51.5],
      zoom: 5,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      // Apply basemap visibility (state may have changed before load fired)
      map.setLayoutProperty(LYR_OSM,  'visibility', basemapRef.current === 'osm'  ? 'visible' : 'none')
      map.setLayoutProperty(LYR_ESRI, 'visibility', basemapRef.current === 'esri' ? 'visible' : 'none')

      // Zone polygon
      map.addSource(SRC_ZONE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: LYR_ZONE_FILL, type: 'fill', source: SRC_ZONE,
        paint: { 'fill-color': ['coalesce', ['get', 'color'], '#22c55e'], 'fill-opacity': 0.15 },
      })
      map.addLayer({
        id: LYR_ZONE_LINE, type: 'line', source: SRC_ZONE,
        paint: { 'line-color': ['coalesce', ['get', 'color'], '#22c55e'], 'line-width': 2 },
      })

      // Drawing in progress
      map.addSource(SRC_DRAW, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: LYR_DRAW_LINE, type: 'line', source: SRC_DRAW,
        paint: { 'line-color': '#facc15', 'line-width': 2, 'line-dasharray': [4, 2] },
      })
      map.addLayer({
        id: LYR_DRAW_VERTS, type: 'circle', source: SRC_DRAW,
        paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-width': 2, 'circle-stroke-color': '#facc15' },
      })

      // Snap indicator
      map.addSource(SRC_SNAP, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: LYR_SNAP, type: 'circle', source: SRC_SNAP,
        paint: { 'circle-radius': 9, 'circle-color': '#00e5ff', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff', 'circle-opacity': 0.85 },
      })

      // Initial bounds
      const emitBounds = () => {
        const zoom = map.getZoom()
        if (zoom < CATALOG_MIN_ZOOM) { onBoundsChangeRef.current(null, zoom); return }
        const b = map.getBounds()
        onBoundsChangeRef.current({ minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() }, zoom)
      }
      emitBounds()
      map.on('moveend', emitBounds)
    })

    // Mouse move — rubber-band line + cursor hint over snapshots
    map.on('mousemove', (e) => {
      if (isDrawingRef.current) {
        if (drawVertsRef.current.length === 0) return
        const raw: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        const snap = findSnapTarget(map, raw, drawVertsRef.current)
        snapTargetRef.current = snap
        const preview = snap ?? raw
        // Show/hide snap indicator
        ;(map.getSource(SRC_SNAP) as maplibregl.GeoJSONSource)?.setData({
          type: 'FeatureCollection',
          features: snap ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: snap }, properties: {} }] : [],
        } as any)
        ;(map.getSource(SRC_DRAW) as maplibregl.GeoJSONSource)
          ?.setData(makeDrawData(drawVertsRef.current, preview))
        return
      }
      snapTargetRef.current = null
      // Cursor pointer over inactive NDVI overlays
      const [x, y] = lngLatToMeters(e.lngLat.lng, e.lngLat.lat)
      const over = snapshotsRef.current.some(s =>
        s.id !== activeIdRef.current &&
        x >= s.bbox.minX && x <= s.bbox.maxX && y >= s.bbox.minY && y <= s.bbox.maxY,
      )
      map.getCanvas().style.cursor = over ? 'pointer' : ''
    })

    // Click — add vertex or select overlay
    map.on('click', (e) => {
      if (isDrawingRef.current) {
        const raw: [number, number] = [e.lngLat.lng, e.lngLat.lat]
        // Use snapped position if available
        const coord: [number, number] = snapTargetRef.current ?? raw
        const verts = drawVertsRef.current

        // Snapped to first vertex → close polygon
        if (verts.length >= 3 && snapTargetRef.current) {
          const fp = map.project(verts[0] as maplibregl.LngLatLike)
          const sp = map.project(snapTargetRef.current as maplibregl.LngLatLike)
          if (Math.hypot(fp.x - sp.x, fp.y - sp.y) < 2) {
            finishRef.current(verts)
            return
          }
        }
        // Fallback: raw click near first vertex
        if (verts.length >= 3 && !snapTargetRef.current) {
          const fp = map.project(verts[0] as maplibregl.LngLatLike)
          const cp = map.project(raw as maplibregl.LngLatLike)
          if (Math.hypot(fp.x - cp.x, fp.y - cp.y) < 15) {
            finishRef.current(verts)
            return
          }
        }

        const next = [...verts, coord]
        drawVertsRef.current = next
        snapTargetRef.current = null
        ;(map.getSource(SRC_DRAW) as maplibregl.GeoJSONSource)?.setData(makeDrawData(next))
        return
      }

      // Select NDVI overlay
      const [x, y] = lngLatToMeters(e.lngLat.lng, e.lngLat.lat)
      const snaps = snapshotsRef.current
      for (let i = snaps.length - 1; i >= 0; i--) {
        const s = snaps[i]
        if (x >= s.bbox.minX && x <= s.bbox.maxX && y >= s.bbox.minY && y <= s.bbox.maxY) {
          onSelectSnapshotRef.current(s.id)
          return
        }
      }
    })

    // Double-click → finish polygon
    map.on('dblclick', (e) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const verts = drawVertsRef.current
      if (verts.length >= 3) finishRef.current(verts)
    })

    // Keyboard ESC
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawingRef.current) cancelRef.current()
    }
    window.addEventListener('keydown', handleKey)

    mapRef.current = map

    return () => {
      window.removeEventListener('keydown', handleKey)
      map.remove()
      mapRef.current = null
      addedSnapshotsRef.current.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Basemap toggle ----

  const handleBasemapChange = useCallback((value: string) => {
    basemapRef.current = value
    setBasemap(value)
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    map.setLayoutProperty(LYR_OSM,  'visibility', value === 'osm'  ? 'visible' : 'none')
    map.setLayoutProperty(LYR_ESRI, 'visibility', value === 'esri' ? 'visible' : 'none')
  }, [])

  // ---- Zone polygon ----

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // GeoJSONSource.setData() is safe to call even while tiles are loading —
    // no need for isStyleLoaded() guard here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(map.getSource(SRC_ZONE) as maplibregl.GeoJSONSource)?.setData(makeZoneData(zone) as any)

    // Validation popup
    popupRef.current?.remove()
    popupRef.current = null
    if (zone && !zone.validation.valid && zone.points.length >= 3) {
      if (!map.isStyleLoaded()) return
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'validation-popup' })
        .setLngLat([zone.centerLng, zone.centerLat])
        .setText(validationErrorText(zone.validation.error))
        .addTo(map)
    }
  }, [zone])

  // ---- NDVI overlays — add / remove / update URL ----

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return

    const currentIds = new Set(snapshots.map(s => s.id))

    // Remove deleted
    for (const [id] of addedSnapshotsRef.current) {
      if (!currentIds.has(id)) {
        const lyr = `ndvi-lyr-${id}`
        const src = `ndvi-src-${id}`
        if (map.getLayer(lyr)) map.removeLayer(lyr)
        if (map.getSource(src)) map.removeSource(src)
        addedSnapshotsRef.current.delete(id)
      }
    }

    // Add new or update URL
    for (const snap of snapshots) {
      const srcId = `ndvi-src-${snap.id}`
      const lyrId = `ndvi-lyr-${snap.id}`
      const existingUrl = addedSnapshotsRef.current.get(snap.id)
      const [swLng, swLat] = metersToLngLat(snap.bbox.minX, snap.bbox.minY)
      const [neLng, neLat] = metersToLngLat(snap.bbox.maxX, snap.bbox.maxY)
      const coords: [[number, number], [number, number], [number, number], [number, number]] = [
        [swLng, neLat], [neLng, neLat], [neLng, swLat], [swLng, swLat],
      ]

      if (existingUrl === undefined) {
        // New snapshot
        map.addSource(srcId, { type: 'image', url: snap.maskedImageUrl, coordinates: coords })
        map.addLayer({
          id: lyrId, type: 'raster', source: srcId,
          paint: {
            'raster-opacity': snap.id === activeSnapshotId ? ndviOpacity : ndviOpacity * 0.45,
            'raster-fade-duration': 0,
          },
        }, LYR_ZONE_FILL) // always below zone polygon
        addedSnapshotsRef.current.set(snap.id, snap.maskedImageUrl)
      } else if (existingUrl !== snap.maskedImageUrl) {
        // URL changed (refresh) — update in-place
        ;(map.getSource(srcId) as maplibregl.ImageSource).updateImage({ url: snap.maskedImageUrl, coordinates: coords })
        addedSnapshotsRef.current.set(snap.id, snap.maskedImageUrl)
      }
    }
  }, [snapshots, activeSnapshotId, ndviOpacity])

  // ---- Opacity updates ----

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    for (const snap of snapshots) {
      const lyrId = `ndvi-lyr-${snap.id}`
      if (map.getLayer(lyrId)) {
        map.setPaintProperty(lyrId, 'raster-opacity',
          snap.id === activeSnapshotId ? ndviOpacity : ndviOpacity * 0.45)
      }
    }
  }, [ndviOpacity, activeSnapshotId, snapshots])

  // ---- FlyTo ----

  const prevFlySeq = useRef(-1)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyToTarget || flyToTarget.seq === prevFlySeq.current) return
    prevFlySeq.current = flyToTarget.seq
    const [swLng, swLat] = metersToLngLat(flyToTarget.bbox.minX, flyToTarget.bbox.minY)
    const [neLng, neLat] = metersToLngLat(flyToTarget.bbox.maxX, flyToTarget.bbox.maxY)
    map.fitBounds([[swLng, swLat], [neLng, neLat]], { padding: 60, duration: 800 })
  }, [flyToTarget])

  // ---- Render ----

  return (
    <div className="relative flex-1 h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Draw toolbar — top left */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {!isDrawing ? (
          <button
            onClick={startDrawing}
            title="Нарисовать полигон"
            className="w-8 h-8 bg-white rounded shadow flex items-center justify-center hover:bg-gray-100 text-gray-700"
          >
            {/* Polygon icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="8,1 15,6 12,14 4,14 1,6" />
            </svg>
          </button>
        ) : (
          <button
            onClick={cancelDrawing}
            title="Отменить рисование (Esc)"
            className="w-8 h-8 bg-red-500 text-white rounded shadow flex items-center justify-center hover:bg-red-600 text-sm font-bold"
          >
            ✕
          </button>
        )}
        {zone && !isDrawing && (
          <button
            onClick={() => { onZoneChange([]); }}
            title="Очистить зону"
            className="w-8 h-8 bg-white rounded shadow flex items-center justify-center hover:bg-gray-100 text-gray-500 text-sm"
          >
            🗑
          </button>
        )}
      </div>

      {/* Basemap switcher — below navigation control */}
      <div className="absolute top-24 right-2 z-10">
        <select
          value={basemap}
          onChange={e => handleBasemapChange(e.target.value)}
          className="text-xs bg-white border border-gray-300 rounded shadow px-1 py-0.5 cursor-pointer"
        >
          <option value="esri">Esri Satellite</option>
          <option value="osm">OpenStreetMap</option>
        </select>
      </div>

      {/* Drawing hint */}
      {isDrawing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/70 text-white text-xs px-3 py-1.5 rounded pointer-events-none">
          Кликайте для добавления вершин · двойной клик или клик на первую вершину для завершения · Esc — отмена
        </div>
      )}

      {/* NDVI loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1000] bg-black/40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-white">
            <Spinner size="lg" />
            <span className="text-sm">Запрашиваем снимок…</span>
          </div>
        </div>
      )}
    </div>
  )
}

