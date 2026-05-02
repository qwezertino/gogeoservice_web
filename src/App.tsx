import { useState, useCallback, useEffect } from 'react'
import { MapView } from './components/Map/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SnapshotPanel } from './components/Sidebar/SnapshotPanel'
import { Toast, useToast } from './components/ui/Toast'
import { useDrawnZone } from './hooks/useDrawnZone'
import { useNdviRequest } from './hooks/useNdviRequest'
import { useSnapshots } from './hooks/useSnapshots'
import { useViewportCatalog } from './hooks/useViewportCatalog'
import { deleteTile } from './utils/catalogApi'
import { DEFAULT_WINDOW, DEFAULT_CLOUD } from './config'
import type { FlyToTarget } from './components/Map/FlyToController'
import type { BBox4326 } from './types'
import type { LatLng } from 'leaflet'

function getDefaultDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

export function App() {
  const { zone, setPoints, clear: clearZone } = useDrawnZone()
  const { state: ndviState, request: requestNdvi, reset: resetNdvi } = useNdviRequest()
  const { messages, show: showToast, remove: removeToast } = useToast()
  const {
    snapshots, activeId,
    add: addSnapshot, remove: removeSnapshot, removeMany: removeManySnapshots,
    select: selectSnapshot, clearAll: clearAllSnapshots, updateBlobUrl: updateSnapshotBlobUrl,
  } = useSnapshots()
  const [date, setDate] = useState(getDefaultDate)
  const [opacity, setOpacity] = useState(0.85)
  const [searchWindow, setSearchWindow] = useState(DEFAULT_WINDOW)
  const [searchCloud, setSearchCloud] = useState(DEFAULT_CLOUD)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)
  const [mapBbox, setMapBbox] = useState<BBox4326 | null>(null)
  const [catalogYear, setCatalogYear] = useState(new Date().getFullYear())

  const handleBoundsChange = useCallback((bbox: BBox4326 | null, _zoom: number) => {
    setMapBbox(bbox)
  }, [])

  const handleAddCatalogTile = useCallback(
    (tile: { bbox: import('./types').BBox3857; date: string; blobUrl: string; minioKey: string }) =>
      addSnapshot({ maskedImageUrl: tile.blobUrl, bbox: tile.bbox, date: tile.date, minioKey: tile.minioKey, source: 'catalog' }),
    [addSnapshot],
  )

  const catalogState = useViewportCatalog(
    catalogYear,
    mapBbox,
    handleAddCatalogTile,
    removeManySnapshots,
    updateSnapshotBlobUrl,
  )

  // Когда NDVI-запрос успешен → сохраняем снимок (сервер уже замаскировал по полигону)
  useEffect(() => {
    if (ndviState.status !== 'success' || !zone) return

    const { imageUrl, provider } = ndviState
    const { bbox } = zone
    const currentDate = date

    addSnapshot({ maskedImageUrl: imageUrl, bbox, date: currentDate })
    const src = provider ? ` (источник: ${provider})` : ''
    showToast(`Снимок получен ✓${src}`, 'success')
    resetNdvi()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ndviState.status === 'success' ? ndviState.imageUrl : null])

  // Ошибки
  useEffect(() => {
    if (ndviState.status === 'error') showToast(ndviState.message, 'error')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ndviState.status === 'error' ? ndviState.message : null])

  const handleZoneChange = useCallback((points: LatLng[]) => {
    setPoints(points)
    resetNdvi()
  }, [setPoints, resetNdvi])

  const handleRequest = useCallback(() => {
    if (!zone || !zone.validation.valid) return
    requestNdvi(zone.bbox, date, searchWindow, searchCloud, zone.points)
  }, [zone, date, searchWindow, searchCloud, requestNdvi])

  const handleResetZone = useCallback(() => {
    clearZone()
    resetNdvi()
  }, [clearZone, resetNdvi])

  const handleSelectSnapshot = useCallback((id: number) => {
    selectSnapshot(id)
    const snap = snapshots.find(s => s.id === id)
    if (snap) setFlyToTarget({ bbox: snap.bbox, seq: Date.now() })
  }, [snapshots, selectSnapshot])

  const handleDeleteSnapshot = useCallback(async (id: number) => {
    const snap = snapshots.find(s => s.id === id)
    removeSnapshot(id)
    if (snap?.minioKey) {
      try {
        await deleteTile(snap.minioKey)
      } catch {
        showToast('Не удалось удалить снимок из базы', 'error')
      }
    }
  }, [snapshots, removeSnapshot, showToast])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <Sidebar
        zone={zone}
        date={date}
        onDateChange={setDate}
        window={searchWindow}
        onWindowChange={setSearchWindow}
        cloud={searchCloud}
        onCloudChange={setSearchCloud}
        onRequest={handleRequest}
        onResetZone={handleResetZone}
        loading={ndviState.status === 'loading'}
        opacity={opacity}
        onOpacityChange={setOpacity}
        hasActiveSnapshot={activeId !== null}
        catalogYear={catalogYear}
        onCatalogYearChange={setCatalogYear}
        catalogLoading={catalogState.loading}
        catalogProgress={catalogState.progress}
        catalogTotal={catalogState.total}
        catalogZoomOk={mapBbox !== null}
      />
      <MapView
        zone={zone}
        onZoneChange={handleZoneChange}
        snapshots={snapshots}
        activeSnapshotId={activeId}
        onSelectSnapshot={handleSelectSnapshot}
        ndviOpacity={opacity}
        loading={ndviState.status === 'loading'}
        flyToTarget={flyToTarget}
        onBoundsChange={handleBoundsChange}
      />
      <SnapshotPanel
        snapshots={snapshots}
        activeId={activeId}
        onSelect={handleSelectSnapshot}
        onDelete={handleDeleteSnapshot}
        onClearAll={clearAllSnapshots}
      />
      <Toast messages={messages} onRemove={removeToast} />
    </div>
  )
}

export default App
