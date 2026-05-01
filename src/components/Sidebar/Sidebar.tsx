import { DatePicker } from './DatePicker'
import { ZoneInfo } from './ZoneInfo'
import { NdviLegend } from './NdviLegend'
import { Slider } from '../ui/Slider'
import { Spinner } from '../ui/Spinner'
import type { DrawnZone } from '../../hooks/useDrawnZone'

interface SidebarProps {
  zone: DrawnZone | null
  date: string
  onDateChange: (d: string) => void
  window: number
  onWindowChange: (v: number) => void
  cloud: number
  onCloudChange: (v: number) => void
  onRequest: () => void
  onResetZone: () => void
  loading: boolean
  opacity: number
  onOpacityChange: (v: number) => void
  hasActiveSnapshot: boolean
}

export function Sidebar({
  zone, date, onDateChange,
  window, onWindowChange, cloud, onCloudChange,
  onRequest, onResetZone,
  loading, opacity, onOpacityChange, hasActiveSnapshot,
}: SidebarProps) {
  const canRequest = !loading && zone !== null && zone.validation.valid && date !== ''

  return (
    <aside className="w-80 bg-gray-800 flex flex-col h-full overflow-y-auto shadow-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-700">
        <h1 className="text-white font-bold text-lg leading-tight">NDVI Viewer</h1>
        <p className="text-gray-400 text-xs mt-0.5">Sentinel-2 · Geogoservice</p>
      </div>

      <div className="flex-1 flex flex-col gap-5 px-5 py-5">
        {/* Hint */}
        {!zone && (
          <div className="bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-2.5 text-xs text-blue-200">
            Нарисуйте полигон на карте (минимум 3 точки), выберите дату и нажмите «Получить NDVI».
          </div>
        )}

        {/* Zone info */}
        {zone && <ZoneInfo zone={zone} />}

        {/* Date picker */}
        <DatePicker value={date} onChange={onDateChange} />

        {/* Search params */}
        <div className="flex flex-col gap-3 bg-gray-700/30 rounded-lg px-3 py-3">
          <Slider
            value={window}
            onChange={onWindowChange}
            min={1}
            max={30}
            step={1}
            label="Окно поиска"
            format={v => `±${Math.round(v)} дн.`}
          />
          <Slider
            value={cloud}
            onChange={onCloudChange}
            min={1}
            max={100}
            step={1}
            label="Макс. облачность"
            format={v => `${Math.round(v)}%`}
          />
        </div>

        {/* Request button */}
        <button
          onClick={onRequest}
          disabled={!canRequest}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors
            ${canRequest
              ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
        >
          {loading ? <><Spinner size="sm" /><span>Загрузка…</span></> : 'Получить NDVI'}
        </button>

        {/* Opacity slider */}
        {hasActiveSnapshot && (
          <Slider
            value={opacity}
            onChange={onOpacityChange}
            label="Прозрачность снимка"
          />
        )}

        {/* Reset drawn zone */}
        {zone && (
          <button
            onClick={onResetZone}
            disabled={loading}
            className="w-full py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40"
          >
            Сбросить геозону
          </button>
        )}

        {/* NDVI Legend */}
        <NdviLegend />
      </div>

      <div className="px-5 py-3 border-t border-gray-700 text-[11px] text-gray-600 text-center">
        Данные: Sentinel-2 L2A · Облачность &lt; {cloud}%
      </div>
    </aside>
  )
}
