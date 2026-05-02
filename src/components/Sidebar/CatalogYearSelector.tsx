import { Spinner } from '../ui/Spinner'
import { CATALOG_MIN_ZOOM } from '../Map/MapBoundsCapture'

interface CatalogYearSelectorProps {
  year: number
  onYearChange: (year: number) => void
  loading: boolean
  progress: number
  total: number
  zoomOk: boolean
}

const CURRENT_YEAR = new Date().getFullYear()

export function CatalogYearSelector({ year, onYearChange, loading, progress, total, zoomOk }: CatalogYearSelectorProps) {
  return (
    <div className="flex flex-col gap-2 bg-gray-700/30 rounded-lg px-3 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">Год снимков из БД</span>
        {loading && (
          <div className="flex items-center gap-1.5 text-[11px] text-blue-400">
            <Spinner size="sm" />
            <span>{total > 0 ? `${progress}/${total}` : '…'}</span>
          </div>
        )}
      </div>

      <input
        type="number"
        min={2017}
        max={CURRENT_YEAR}
        value={year}
        onChange={e => {
          const v = Number(e.target.value)
          if (v >= 2017 && v <= CURRENT_YEAR) onYearChange(v)
        }}
        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white text-center
                   focus:outline-none focus:border-blue-500"
      />

      {loading && total > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-0.5 overflow-hidden">
          <div
            className="bg-blue-500 h-0.5 rounded-full transition-all duration-200"
            style={{ width: `${Math.round((progress / total) * 100)}%` }}
          />
        </div>
      )}

      <p className="text-[11px] leading-tight" style={{ color: zoomOk ? '#4b5563' : '#f59e0b' }}>
        {zoomOk
          ? 'Автозагрузка при движении карты'
          : `Приблизьтесь до зума ${CATALOG_MIN_ZOOM}+ для загрузки снимков`}
      </p>
    </div>
  )
}
