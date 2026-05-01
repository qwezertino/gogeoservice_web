import { useState, useCallback, useEffect } from 'react'
import { MapView } from './components/Map/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Toast, useToast } from './components/ui/Toast'
import { useDrawnZone } from './hooks/useDrawnZone'
import { useNdviRequest } from './hooks/useNdviRequest'
import { useSnapshots } from './hooks/useSnapshots'
import { maskImageToPolygon } from './utils/maskPolygon'
import type { FlyToTarget } from './components/Map/FlyToController'
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
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null)

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
    requestNdvi(zone.bbox, date)
  }, [zone, date, requestNdvi])

  const handleResetZone = useCallback(() => {
    clearZone()
    resetNdvi()
  }, [clearZone, resetNdvi])

  const handleSelectSnapshot = useCallback((id: number) => {
    selectSnapshot(id)
    const snap = snapshots.find(s => s.id === id)
    if (snap) setFlyToTarget({ bbox: snap.bbox, seq: Date.now() })
  }, [snapshots, selectSnapshot])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <Sidebar
        zone={zone}
        date={date}
        onDateChange={setDate}
        onRequest={handleRequest}
        onResetZone={handleResetZone}
        loading={ndviState.status === 'loading'}
        opacity={opacity}
        onOpacityChange={setOpacity}
        snapshots={snapshots}
        activeSnapshotId={activeId}
        onSelectSnapshot={handleSelectSnapshot}
        onDeleteSnapshot={removeSnapshot}
        onClearAllSnapshots={clearAllSnapshots}
      />
      <MapView
        zone={zone}
        onZoneChange={handleZoneChange}
        snapshots={snapshots}
        activeSnapshotId={activeId}
        ndviOpacity={opacity}
        loading={ndviState.status === 'loading'}
        flyToTarget={flyToTarget}
      />
      <Toast messages={messages} onRemove={removeToast} />
    </div>
  )
}

export default App
