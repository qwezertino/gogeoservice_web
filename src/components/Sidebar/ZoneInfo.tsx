import type { DrawnZone } from '../../hooks/useDrawnZone'

interface ZoneInfoProps {
  zone: DrawnZone
}

export function ZoneInfo({ zone }: ZoneInfoProps) {
  const widthKm = (zone.validation.widthM / 1000).toFixed(1)
  const heightKm = (zone.validation.heightM / 1000).toFixed(1)
  const areaKm2 = ((zone.validation.widthM * zone.validation.heightM) / 1_000_000).toFixed(2)

  return (
    <div className="bg-gray-700/50 rounded-lg p-3 text-xs text-gray-300 space-y-1">
      <p className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Геозона</p>
      <div className="flex justify-between">
        <span>Размер bbox</span>
        <span className="text-white font-mono">{widthKm} × {heightKm} км</span>
      </div>
      <div className="flex justify-between">
        <span>Площадь bbox</span>
        <span className="text-white font-mono">{areaKm2} км²</span>
      </div>
      <div className="flex justify-between">
        <span>Центр</span>
        <span className="text-white font-mono">
          {zone.centerLng.toFixed(4)}, {zone.centerLat.toFixed(4)}
        </span>
      </div>
    </div>
  )
}
