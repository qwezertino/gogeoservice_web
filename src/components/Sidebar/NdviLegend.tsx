export function NdviLegend() {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Легенда NDVI</p>
      <div className="flex flex-col gap-1.5 text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <div className="w-5 h-4 rounded border border-gray-500 bg-gray-700" />
          <span>Прозрачно — вода, облака, голые поверхности</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-4 rounded" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00)' }} />
          <span>Редкая / стрессовая растительность (NDVI 0.05–0.2)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-4 rounded" style={{ background: 'linear-gradient(to right, #90ee90, #006400)' }} />
          <span>Здоровая растительность (NDVI 0.2–1.0)</span>
        </div>
      </div>
    </div>
  )
}
