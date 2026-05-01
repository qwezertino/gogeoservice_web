const MIN_DATE = '2017-01-01'

function getMaxDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 15)
  return d.toISOString().split('T')[0]
}

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const maxDate = getMaxDate()

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
        Дата снимка
      </label>
      <input
        type="date"
        value={value}
        min={MIN_DATE}
        max={maxDate}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-green-500 transition-colors cursor-pointer"
      />
      <p className="text-[11px] text-gray-500">Диапазон: {MIN_DATE} — {maxDate}</p>
    </div>
  )
}
