import { useState, useCallback, useRef } from 'react'
import type { Snapshot, BBox3857 } from '../types'

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const counterRef = useRef(0)

  const add = useCallback((data: { maskedImageUrl: string; bbox: BBox3857; date: string; minioKey?: string; source?: 'catalog' }) => {
    const id = ++counterRef.current
    const label = `Снимок #${id} · ${data.date}`
    const snapshot: Snapshot = { id, label, ...data }
    setSnapshots(prev => [...prev, snapshot])
    setActiveId(id)
    return id
  }, [])

  // Удаляет все снимки из каталога (перед загрузкой нового)
  const removeCatalog = useCallback(() => {
    setSnapshots(prev => {
      const keep: Snapshot[] = []
      for (const s of prev) {
        if (s.source === 'catalog') URL.revokeObjectURL(s.maskedImageUrl)
        else keep.push(s)
      }
      return keep
    })
    setActiveId(prev => {
      // если активный — каталожный, сбрасываем (snapshots ещё не обновлён, поэтому просто null)
      return null
    })
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

  const removeMany = useCallback((ids: number[]) => {
    const idSet = new Set(ids)
    setSnapshots(prev => {
      const keep: Snapshot[] = []
      for (const s of prev) {
        if (idSet.has(s.id)) URL.revokeObjectURL(s.maskedImageUrl)
        else keep.push(s)
      }
      return keep
    })
    setActiveId(prev => (prev !== null && idSet.has(prev) ? null : prev))
  }, [])

  const select = useCallback((id: number) => {
    setActiveId(id)
  }, [])

  const updateBlobUrl = useCallback((id: number, newUrl: string) => {
    setSnapshots(prev => prev.map(s => {
      if (s.id !== id) return s
      URL.revokeObjectURL(s.maskedImageUrl)
      return { ...s, maskedImageUrl: newUrl }
    }))
  }, [])

  const activeSnapshot = snapshots.find(s => s.id === activeId) ?? null

  return { snapshots, activeSnapshot, activeId, add, remove, removeMany, removeCatalog, select, updateBlobUrl, clearAll }
}
