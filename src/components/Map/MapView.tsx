import { MapContainer, TileLayer, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { DrawControl } from './DrawControl'
import { NdviOverlay } from './NdviOverlay'
import { FlyToController } from './FlyToController'
import type { FlyToTarget } from './FlyToController'
import { Spinner } from '../ui/Spinner'
import type { DrawnZone } from '../../hooks/useDrawnZone'
import type { Snapshot } from '../../types'
import type { LatLng } from 'leaflet'

interface MapViewProps {
  zone: DrawnZone | null
  onZoneChange: (points: LatLng[]) => void
  snapshots: Snapshot[]
  activeSnapshotId: number | null
  onSelectSnapshot: (id: number) => void
  ndviOpacity: number
  loading: boolean
  flyToTarget: FlyToTarget | null
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'

const ESRI_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const ESRI_ATTR = 'Tiles &copy; Esri'

export function MapView({ zone, onZoneChange, snapshots, activeSnapshotId, onSelectSnapshot, ndviOpacity, loading, flyToTarget }: MapViewProps) {
  return (
    <div className="relative flex-1 h-full">
      <MapContainer
        center={[51.5, 10]}
        zoom={5}
        className="w-full h-full"
        zoomControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer url={OSM_URL} attribution={OSM_ATTR} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Esri Satellite">
            <TileLayer url={ESRI_URL} attribution={ESRI_ATTR} />
          </LayersControl.BaseLayer>
        </LayersControl>

        <DrawControl zone={zone} onZoneChange={onZoneChange} />

        <FlyToController target={flyToTarget} />

        {snapshots.map(snap => (
          <NdviOverlay
            key={snap.id}
            imageUrl={snap.maskedImageUrl}
            bbox={snap.bbox}
            opacity={snap.id === activeSnapshotId ? ndviOpacity : ndviOpacity * 0.45}
            isActive={snap.id === activeSnapshotId}
            onClick={() => onSelectSnapshot(snap.id)}
          />
        ))}
      </MapContainer>

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
