import { useState } from 'react'
import type { Snapshot } from '../../types'

interface SnapshotPanelProps {
  snapshots: Snapshot[]
  activeId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onClearAll: () => void
}

interface SnapGroup {
  key: string
  label: string
  sublabel: string
  snaps: Snapshot[]
  defaultOpen: boolean
}

function bboxKey(snap: Snapshot): string {
  const b = snap.bbox
  return `${b.minX.toFixed(0)}_${b.minY.toFixed(0)}_${b.maxX.toFixed(0)}_${b.maxY.toFixed(0)}`
}

function buildGroups(snapshots: Snapshot[]): SnapGroup[] {
  // Group by bbox — each unique bbox = one zone
  const order: string[] = []
  const byBbox = new Map<string, Snapshot[]>()

  for (const snap of snapshots) {
    const key = bboxKey(snap)
    if (!byBbox.has(key)) {
      order.push(key)
      byBbox.set(key, [])
    }
    byBbox.get(key)!.push(snap)
  }

  return order.map((key, idx) => {
    const snaps = [...byBbox.get(key)!].sort((a, b) => b.date.localeCompare(a.date))
    const dateFrom = snaps[snaps.length - 1].date
    const dateTo = snaps[0].date
    const label = `Зона ${idx + 1}`
    const sublabel = snaps.length === 1
      ? snaps[0].date
      : `${snaps.length} снимков · ${dateFrom} — ${dateTo}`
    return { key, label, sublabel, snaps, defaultOpen: false }
  }).reverse() // newest zone first
}

function SnapItem({ snap, isActive, onSelect, onDelete }: {
  snap: Snapshot
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group
        ${isActive
          ? 'bg-green-900/50 border border-green-700/60'
          : 'bg-gray-700/30 border border-transparent hover:bg-gray-700/60'}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
      <img
        src={snap.maskedImageUrl}
        alt=""
        className="w-7 h-7 rounded object-cover flex-shrink-0 border border-gray-600"
      />
      <span className={`text-xs flex-1 truncate leading-tight ${isActive ? 'text-white' : 'text-gray-300'}`}>
        {snap.date}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs"
        title="Удалить снимок"
      >
        ✕
      </button>
    </div>
  )
}

function GroupBlock({ group, activeId, onSelect, onDelete }: {
  group: SnapGroup
  activeId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
}) {
  const hasActive = group.snaps.some(s => s.id === activeId)
  const [open, setOpen] = useState(() => group.defaultOpen || hasActive)

  const previewSnap = group.snaps.find(s => s.id === activeId) ?? group.snaps[0]

  return (
    <div className="flex flex-col">
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg w-full text-left transition-colors
          ${hasActive
            ? 'bg-green-900/30 border border-green-800/50'
            : 'bg-gray-700/50 border border-transparent hover:bg-gray-700/80'}`}
      >
        <img
          src={previewSnap.maskedImageUrl}
          alt=""
          className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-600"
        />
        <div className="flex-1 min-w-0 text-left">
          <div className={`text-xs font-medium truncate ${hasActive ? 'text-green-300' : 'text-white'}`}>
            {group.label}
          </div>
          <div className="text-[11px] text-gray-400">{group.sublabel}</div>
        </div>
        <span className="text-gray-500 text-[10px] flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded list */}
      {open && (
        <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-gray-700 pl-2 pb-1">
          {group.snaps.map(snap => (
            <SnapItem
              key={snap.id}
              snap={snap}
              isActive={snap.id === activeId}
              onSelect={() => onSelect(snap.id)}
              onDelete={() => onDelete(snap.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SnapshotPanel({ snapshots, activeId, onSelect, onDelete, onClearAll }: SnapshotPanelProps) {
  if (snapshots.length === 0) return null

  const groups = buildGroups(snapshots)

  return (
    <aside className="w-64 bg-gray-800 flex flex-col h-full border-l border-gray-700 shadow-xl">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">Снимки</span>
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
      <div className="flex-1 overflow-y-auto flex flex-col gap-1 p-2">
        {groups.map(group => (
          <GroupBlock
            key={group.key}
            group={group}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-gray-700 text-[11px] text-gray-600 text-center">
        Кликните на снимок для центрирования
      </div>
    </aside>
  )
}
