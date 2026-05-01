import { useState, useCallback, useRef } from 'react'
import type { Snapshot, BBox3857 } from '../types'

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const counterRef = useRef(0)

  const add = useCallback((data: { maskedImageUrl: string; bbox: BBox3857; date: string }) => {
    const id = ++counterRef.current
    const label = `Снимок #${id} · ${data.date}`
    const snapshot: Snapshot = { id, label, ...data }
    setSnapshots(prev => [...prev, snapshot])
    setActiveId(id)
    return id
  }, [])

  const remove = useCallback((id: number) => {
    setSnapshots(prev => {
      const snap = prev.find(s => s.id === id)
      if (snap) URL.revokeObjectURL(snap.maskedImageUrl)
      return prev.filter(s => s.id !== id)
    })
    setActiveId(prev => (prev === id ? null : prev))
  }, [])

  const clearAll = useCallback(() => {
    setSnapshots(prev => {
      prev.forEach(s => URL.revokeObjectURL(s.maskedImageUrl))
      return []
    })
    setActiveId(null)
  }, [])

  const select = useCallback((id: number) => {
    setActiveId(id)
  }, [])

  const activeSnapshot = snapshots.find(s => s.id === activeId) ?? null

  return { snapshots, activeSnapshot, activeId, add, remove, select, clearAll }
}
