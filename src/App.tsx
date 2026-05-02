import { useState, useCallback, useEffect } from 'react'
import { MapView } from './components/Map/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { SnapshotPanel } from './components/Sidebar/SnapshotPanel'
import { Toast, useToast } from './components/ui/Toast'
import { useDrawnZone } from './hooks/useDrawnZone'
import { useNdviRequest } from './hooks/useNdviRequest'
import { useSnapshots } from './hooks/useSnapshots'
import { useCatalog } from './hooks/useCatalog'
import { maskImageToPolygon } from './utils/maskPolygon'
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
    add: addSnapshot, remove: removeSnapshot,
    select: selectSnapshot, clearAll: clearAllSnapshots,
  } = useSnapshots()
  const [date, setDate] = useState(getDefaultDate)
  const [opacity, setOpacity] = useState(0.85)
  const [searchWindow, setSearchWindow] = useState(DEFAULT_WINDOW)
  const [searchCloud, setSearchCloud] = useState(DEFAULT_CLOUD)
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)
  const [mapBbox, setMapBbox] = useState<BBox4326 | null>(null)
  const { state: catalogState, load: loadCatalog } = useCatalog()

  // Когда NDVI-запрос успешен → маскируем → сохраняем снимок
  useEffect(() => {
    if (ndviState.status !== 'success' || !zone) return

    const { imageUrl, provider } = ndviState
    const { bbox, points } = zone
    const currentDate = date
    let cancelled = false

    maskImageToPolygon(imageUrl, bbox, points)
      .then(url => {
        if (cancelled) { URL.revokeObjectURL(url); return }
        addSnapshot({ maskedImageUrl: url, bbox, date: currentDate })
        const src = provider ? ` (источник: ${provider})` : ''
        showToast(`Снимок получен ✓${src}`, 'success')
        resetNdvi()
      })
      .catch(() => {
        if (!cancelled) {
          addSnapshot({ maskedImageUrl: imageUrl, bbox, date: currentDate })
          showToast('Снимок получен ✓', 'success')
          resetNdvi()
        }
      })

    return () => { cancelled = true }
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
    requestNdvi(zone.bbox, date, searchWindow, searchCloud)
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

  const handleLoadCatalog = useCallback(async (year: number) => {
    if (!mapBbox) return
    const count = await loadCatalog(year, mapBbox, ({ bbox, date: tileDate, blobUrl, minioKey }) => {
      addSnapshot({ maskedImageUrl: blobUrl, bbox, date: tileDate, minioKey })
    })
    if (count === 0) showToast(`Снимков за ${year} в этой области не найдено`, 'info')
    else showToast(`Загружено ${count} снимков за ${year}`, 'success')
  }, [mapBbox, loadCatalog, addSnapshot, showToast])

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
        onLoadCatalog={handleLoadCatalog}
        catalogLoading={catalogState.status === 'loading'}
        catalogProgress={catalogState.status === 'loading' ? catalogState.progress : 0}
        catalogTotal={catalogState.status === 'loading' ? catalogState.total : 0}
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
        onBoundsChange={setMapBbox}
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
