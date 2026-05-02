import { useState } from 'react'
import { Spinner } from '../ui/Spinner'

interface CatalogBrowseProps {
  onLoad: (year: number) => void
  loading: boolean
  progress: number
  total: number
}

const CURRENT_YEAR = new Date().getFullYear()

export function CatalogBrowse({ onLoad, loading, progress, total }: CatalogBrowseProps) {
  const [year, setYear] = useState(CURRENT_YEAR - 1)
  const isValid = year >= 2017 && year <= CURRENT_YEAR

  return (
    <div className="flex flex-col gap-2.5 bg-gray-700/30 rounded-lg px-3 py-3">
      <span className="text-xs text-gray-400 font-medium">Обзор базы снимков</span>

      <div className="flex gap-2 items-center">
        <input
          type="number"
          min={2017}
          max={CURRENT_YEAR}
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          disabled={loading}
          className="w-24 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white text-center
                     focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={() => onLoad(year)}
          disabled={loading || !isValid}
          className={`flex-1 py-1.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors
            ${loading || !isValid
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-700 hover:bg-blue-600 text-white cursor-pointer'}`}
        >
          {loading
            ? <><Spinner size="sm" /><span>{total > 0 ? `${progress}/${total}` : '…'}</span></>
            : 'Загрузить'}
        </button>
      </div>

      {/* Прогресс-бар */}
      {loading && total > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-1 overflow-hidden">
          <div
            className="bg-blue-500 h-1 rounded-full transition-all duration-200"
            style={{ width: `${Math.round((progress / total) * 100)}%` }}
          />
        </div>
      )}

      <p className="text-[11px] text-gray-600 leading-tight">
        Загружает все NDVI-снимки за выбранный год из видимой области карты
      </p>
    </div>
  )
}
