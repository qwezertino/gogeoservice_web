import type { Snapshot } from '../../types'

interface SnapshotPanelProps {
  snapshots: Snapshot[]
  activeId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onClearAll: () => void
}

// Высота одного элемента ~52px, показываем 5 до скролла
const ITEM_HEIGHT = 52
const MAX_VISIBLE = 5

export function SnapshotPanel({ snapshots, activeId, onSelect, onDelete, onClearAll }: SnapshotPanelProps) {
  if (snapshots.length === 0) return null

  return (
    <aside className="w-64 bg-gray-800 flex flex-col h-full border-l border-gray-700 shadow-xl">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">История</span>
          <span className="bg-gray-700 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">
            {snapshots.length}
          </span>
        </div>
        <button
          onClick={onClearAll}
          className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
        >
          Очистить всё
        </button>
      </div>

      {/* Scrollable list */}
      <div
        className="overflow-y-auto flex flex-col gap-1 p-2"
        style={{ maxHeight: ITEM_HEIGHT * MAX_VISIBLE + 16 }}
      >
        {snapshots.map(snap => {
          const isActive = snap.id === activeId
          return (
            <div
              key={snap.id}
              onClick={() => onSelect(snap.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group flex-shrink-0
                ${isActive
                  ? 'bg-green-900/50 border border-green-700/60'
                  : 'bg-gray-700/40 border border-transparent hover:bg-gray-700/70'}`}
            >
              {/* Активный индикатор */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-gray-600'}`} />

              {/* Превью */}
              <img
                src={snap.maskedImageUrl}
                alt=""
                className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-600"
              />

              {/* Подпись */}
              <span className={`text-xs flex-1 truncate leading-tight ${isActive ? 'text-white' : 'text-gray-300'}`}>
                {snap.label}
              </span>

              {/* Удалить */}
              <button
                onClick={e => { e.stopPropagation(); onDelete(snap.id) }}
                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs"
                title="Удалить снимок"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-auto px-4 py-3 border-t border-gray-700 text-[11px] text-gray-600 text-center">
        Кликните на снимок для центрирования
      </div>
    </aside>
  )
}
