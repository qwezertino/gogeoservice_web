import type { Snapshot } from '../../types'

interface SnapshotListProps {
  snapshots: Snapshot[]
  activeId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onClearAll: () => void
}

export function SnapshotList({ snapshots, activeId, onSelect, onDelete, onClearAll }: SnapshotListProps) {
  if (snapshots.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          История
          <span className="ml-1.5 bg-gray-700 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">
            {snapshots.length}
          </span>
        </p>
        <button
          onClick={onClearAll}
          className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
        >
          Очистить всё
        </button>
      </div>

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
        {snapshots.map(snap => {
          const isActive = snap.id === activeId
          return (
            <div
              key={snap.id}
              onClick={() => onSelect(snap.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group
                ${isActive
                  ? 'bg-green-900/50 border border-green-700/60'
                  : 'bg-gray-700/40 border border-transparent hover:bg-gray-700/70'}`}
            >
              {/* Индикатор */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-gray-500'}`} />

              {/* Превью */}
              <img
                src={snap.maskedImageUrl}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-600"
              />

              {/* Подпись */}
              <span className={`text-xs flex-1 truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                {snap.label}
              </span>

              {/* Удалить */}
              <button
                onClick={e => { e.stopPropagation(); onDelete(snap.id) }}
                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                title="Удалить снимок"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
