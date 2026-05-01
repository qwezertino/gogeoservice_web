interface SliderProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  format?: (v: number) => string
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.05, label, format }: SliderProps) {
  const display = format ? format(value) : `${Math.round(value * 100)}%`
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{label}</span>
          <span>{display}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-green-500 cursor-pointer"
      />
    </div>
  )
}
