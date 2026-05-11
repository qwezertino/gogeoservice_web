import { useState } from 'react'
import { Slider } from '../ui/Slider'
import { Spinner } from '../ui/Spinner'
import type { DrawnZone } from '../../hooks/useDrawnZone'
import type { RangeJobState } from '../../hooks/useRangeJob'

const MIN_DATE = '2017-01-01'

function getMaxDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 15)
  return d.toISOString().split('T')[0]
}

function getDefaultDates(): { start: string; end: string } {
  const end = new Date()
  end.setDate(end.getDate() - 30)
  const start = new Date(end)
  start.setDate(start.getDate() - 90)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

interface RangeFormProps {
  zone: DrawnZone | null
  jobState: RangeJobState
  onSubmit: (startDate: string, endDate: string, cloud: number) => void
  onCancel: () => void
}

export function RangeForm({ zone, jobState, onSubmit, onCancel }: RangeFormProps) {
  const defaults = getDefaultDates()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [cloud, setCloud] = useState(20)
  const maxDate = getMaxDate()

  const isRunning = jobState.phase === 'submitting' || jobState.phase === 'running'
  const canSubmit =
    zone !== null &&
    zone.validation.valid &&
    startDate !== '' &&
    endDate !== '' &&
    startDate < endDate &&
    !isRunning

  const progress =
    jobState.phase === 'running' && jobState.total > 0
      ? (jobState.done / jobState.total) * 100
      : 0

  function pluralSnimok(n: number) {
    if (n % 10 === 1 && n % 100 !== 11) return 'снимок'
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'снимка'
    return 'снимков'
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Date range inputs */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
          Диапазон дат
        </label>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-500">С</span>
            <input
              type="date"
              value={startDate}
              min={MIN_DATE}
              max={endDate || maxDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-green-500 transition-colors cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-500">По</span>
            <input
              type="date"
              value={endDate}
              min={startDate || MIN_DATE}
              max={maxDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-green-500 transition-colors cursor-pointer"
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-500">Допустимо: {MIN_DATE} — {maxDate}</p>
      </div>

      {/* Cloud cover */}
      <div className="bg-gray-700/30 rounded-lg px-3 py-3">
        <Slider
          value={cloud}
          onChange={setCloud}
          min={1}
          max={100}
          step={1}
          label="Макс. облачность"
          format={v => `${Math.round(v)}%`}
        />
      </div>

      {/* Progress */}
      {jobState.phase === 'running' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Обработка снимков…</span>
            <span>
              {jobState.done} / {jobState.total > 0 ? jobState.total : '?'}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {jobState.phase === 'done' && (
        <div className="text-xs text-green-400 bg-green-900/20 rounded px-3 py-2 text-center">
          Готово — {jobState.count} {pluralSnimok(jobState.count)} добавлено в список
        </div>
      )}

      {jobState.phase === 'error' && (
        <div className="text-xs text-red-400 bg-red-900/20 rounded px-3 py-2">
          {jobState.message}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(startDate, endDate, cloud)}
          disabled={!canSubmit}
          className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors
            ${canSubmit
              ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
        >
          {isRunning
            ? <><Spinner size="sm" /><span>Выполняется…</span></>
            : 'Запустить задание'}
        </button>
        {isRunning && (
          <button
            onClick={onCancel}
            className="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
          >
            Стоп
          </button>
        )}
      </div>
    </div>
  )
}
