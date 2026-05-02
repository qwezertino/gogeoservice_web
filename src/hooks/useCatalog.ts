import { useState, useCallback } from 'react'
import { fetchCatalog, renderCatalogTiles } from '../utils/catalogApi'
import type { BBox4326, BBox3857 } from '../types'

export type CatalogStatus =
  | { status: 'idle' }
  | { status: 'loading'; progress: number; total: number }
  | { status: 'error'; message: string }

export function useCatalog() {
  const [state, setState] = useState<CatalogStatus>({ status: 'idle' })

  const load = useCallback(async (
    year: number,
    mapBbox: BBox4326,
    onTile: (tile: { bbox: BBox3857; date: string; blobUrl: string; minioKey: string }) => void,
  ): Promise<number> => {
    setState({ status: 'loading', progress: 0, total: 0 })
    try {
      const tiles = await fetchCatalog(year, mapBbox)
      if (tiles.length === 0) {
        setState({ status: 'idle' })
        return 0
      }

      setState({ status: 'loading', progress: 0, total: tiles.length })

      const rendered = await renderCatalogTiles(tiles, (done, total) => {
        setState({ status: 'loading', progress: done, total })
      })

      for (const r of rendered) {
        onTile(r)
      }

      setState({ status: 'idle' })
      return rendered.length
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки каталога'
      setState({ status: 'error', message })
      return 0
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, load, reset }
}
