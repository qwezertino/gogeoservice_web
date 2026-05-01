import { useState, useCallback } from 'react'
import { MapView } from './components/Map/MapView'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Toast, useToast } from './components/ui/Toast'
import { useDrawnZone } from './hooks/useDrawnZone'
import { useNdviRequest } from './hooks/useNdviRequest'
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
  const [date, setDate] = useState(getDefaultDate)
  const [opacity, setOpacity] = useState(0.85)
  const [lastStatus, setLastStatus] = useState<string>('idle')

  if (ndviState.status !== lastStatus) {
    setLastStatus(ndviState.status)
    if (ndviState.status === 'success') {
      const provider = ndviState.provider ? ` (источник: ${ndviState.provider})` : ''
      showToast(`Снимок получен ✓${provider}`, 'success')
    } else if (ndviState.status === 'error') {
      showToast(ndviState.message, 'error')
    }
  }

  const handleZoneChange = useCallback((points: LatLng[]) => {
    setPoints(points)
    resetNdvi()
  }, [setPoints, resetNdvi])

  const handleRequest = useCallback(() => {
    if (!zone || !zone.validation.valid) return
    requestNdvi(zone.bbox, date)
  }, [zone, date, requestNdvi])

  const handleReset = useCallback(() => {
    clearZone()
    resetNdvi()
  }, [clearZone, resetNdvi])

  const ndviImageUrl = ndviState.status === 'success' ? ndviState.imageUrl : null
  const ndviBbox = ndviState.status === 'success' && zone ? zone.bbox : null

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900">
      <Sidebar
        zone={zone}
        date={date}
        onDateChange={setDate}
        onRequest={handleRequest}
        onReset={handleReset}
        loading={ndviState.status === 'loading'}
        hasResult={ndviState.status === 'success'}
        opacity={opacity}
        onOpacityChange={setOpacity}
      />
      <MapView
        zone={zone}
        onZoneChange={handleZoneChange}
        ndviImageUrl={ndviImageUrl}
        ndviBbox={ndviBbox}
        ndviOpacity={opacity}
        loading={ndviState.status === 'loading'}
      />
      <Toast messages={messages} onRemove={removeToast} />
    </div>
  )
}

export default App
