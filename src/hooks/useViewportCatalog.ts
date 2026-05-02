import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchCatalog, renderCatalogTiles } from '../utils/catalogApi'
import { CATALOG_DEBOUNCE_MS, CATALOG_MAX_TILES, CATALOG_REFRESH_MS } from '../config'
import { lngLatToMeters } from '../utils/projection'
import type { BBox4326, BBox3857, TileRecord } from '../types'

/** Мировой bbox — загружаем весь каталог за год одним запросом */
const WORLD_BBOX: BBox4326 = { minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 }

/** Пересекается ли тайл (EPSG:3857) с viewport (EPSG:3857) */
function intersects3857(r: TileRecord, bbox: BBox3857): boolean {
  return (
    r.bbox_minx < bbox.maxX && r.bbox_maxx > bbox.minX &&
    r.bbox_miny < bbox.maxY && r.bbox_maxy > bbox.minY
  )
}

/** Конвертирует WGS84 viewport в BBox3857 */
function bboxToMeters(bbox: BBox4326): BBox3857 {
  const [minX, minY] = lngLatToMeters(bbox.minLng, bbox.minLat)
  const [maxX, maxY] = lngLatToMeters(bbox.maxLng, bbox.maxLat)
  return { minX, minY, maxX, maxY }
}

interface LoadedTile {
  snapshotId: number
  minioKey: string
  record: TileRecord
}

export interface ViewportCatalogState {
  loading: boolean
  progress: number
  total: number
}

/**
 * Подгружает NDVI-тайлы из каталога по году и viewport.
 * - Каталог (список записей) загружается ОДИН РАЗ за год мировым bbox
 * - Фильтрация по viewport — локально, без запросов к API
 * - Рендерит PNG только для новых тайлов в viewport
 * - Лимит CATALOG_MAX_TILES blob URL в памяти (VITE_CATALOG_MAX_TILES)
 * - Дебаунс CATALOG_DEBOUNCE_MS при движении карты (VITE_CATALOG_DEBOUNCE_MS)
 * - Периодический рефреш CATALOG_REFRESH_MS: перерендерит все тайлы и подменяет blob URL (VITE_CATALOG_REFRESH_MS, 0 = выкл)
 */
export function useViewportCatalog(
  year: number,
  mapBbox: BBox4326 | null,
  onAdd: (tile: { bbox: BBox3857; date: string; blobUrl: string; minioKey: string }) => number,
  onRemoveMany: (ids: number[]) => void,
  onUpdateBlobUrl: (id: number, newUrl: string) => void,
) {
  const [state, setState] = useState<ViewportCatalogState>({ loading: false, progress: 0, total: 0 })

  /** Все записи за текущий год (метаданные, без PNG) */
  const allRecordsRef = useRef<TileRecord[]>([])
  /** true после успешной загрузки каталога за год */
  const catalogLoadedRef = useRef(false)
  /** Уже отрендеренные тайлы (с blob URL) */
  const tilesRef = useRef<LoadedTile[]>([])
  const renderAbortRef = useRef<AbortController | null>(null)
  const refreshAbortRef = useRef<AbortController | null>(null)
  const yearAbortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mapBboxRef = useRef<BBox4326 | null>(mapBbox)
  useEffect(() => { mapBboxRef.current = mapBbox }, [mapBbox])

  /** Рендерит видимые тайлы из allRecordsRef, которых ещё нет в памяти */
  const renderViewport = useCallback(async (bbox: BBox4326) => {
    renderAbortRef.current?.abort()
    const ctrl = new AbortController()
    renderAbortRef.current = ctrl

    const currentKeySet = new Set(tilesRef.current.map(t => t.minioKey))
    const bbox3857 = bboxToMeters(bbox)
    const toLoad = allRecordsRef.current
      .filter(r => intersects3857(r, bbox3857) && !currentKeySet.has(r.minio_key))

    console.log('[catalog] renderViewport: allRecords=', allRecordsRef.current.length, 'toLoad=', toLoad.length, 'bbox=', bbox)
    if (allRecordsRef.current.length > 0) console.log('[catalog] first record bbox:', allRecordsRef.current[0])

    if (toLoad.length === 0) {
      setState({ loading: false, progress: 0, total: 0 })
      return
    }

    const freeSlots = CATALOG_MAX_TILES - tilesRef.current.length
    const limited = toLoad.slice(0, Math.max(0, freeSlots))
    if (limited.length === 0) {
      setState({ loading: false, progress: 0, total: 0 })
      return
    }

    setState({ loading: true, progress: 0, total: limited.length })

    try {
      const rendered = await renderCatalogTiles(
        limited,
        (done, total) => {
          if (!ctrl.signal.aborted) setState({ loading: true, progress: done, total })
        },
        ctrl.signal,
      )

      if (ctrl.signal.aborted) {
        rendered.forEach(r => URL.revokeObjectURL(r.blobUrl))
        return
      }

      const newRefs: LoadedTile[] = rendered.map(r => ({
        snapshotId: onAdd({ bbox: r.bbox, date: r.date, blobUrl: r.blobUrl, minioKey: r.minioKey }),
        minioKey: r.minioKey,
        record: limited.find(t => t.minio_key === r.minioKey)!,
      }))
      tilesRef.current = [...tilesRef.current, ...newRefs]

    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[viewport-catalog]', e)
      }
    } finally {
      if (!ctrl.signal.aborted) {
        setState({ loading: false, progress: 0, total: 0 })
      }
    }
  }, [onAdd])

  /** Загружает весь каталог за год (один API-запрос), затем рендерит viewport */
  const loadYear = useCallback(async (yr: number) => {
    yearAbortRef.current?.abort()
    const ctrl = new AbortController()
    yearAbortRef.current = ctrl

    setState({ loading: true, progress: 0, total: 0 })
    try {
      const records = await fetchCatalog(yr, WORLD_BBOX, ctrl.signal)
      if (ctrl.signal.aborted) return
      console.log('[catalog] loaded', records.length, 'records for year', yr)
      allRecordsRef.current = records
      catalogLoadedRef.current = true
      const bbox = mapBboxRef.current
      console.log('[catalog] viewport bbox at load time:', bbox)
      if (bbox) await renderViewport(bbox)
      else console.warn('[catalog] bbox is null after year load — will render on next pan')
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[viewport-catalog-year]', e)
      }
      if (!ctrl.signal.aborted) setState({ loading: false, progress: 0, total: 0 })
    }
  }, [renderViewport])

  /** Перерендерит все тайлы в памяти и подменяет blob URL (без удаления/добавления) */
  const refresh = useCallback(async () => {
    if (tilesRef.current.length === 0) return
    refreshAbortRef.current?.abort()
    const ctrl = new AbortController()
    refreshAbortRef.current = ctrl

    try {
      const records = tilesRef.current.map(t => t.record)
      const rendered = await renderCatalogTiles(records, undefined, ctrl.signal)
      if (ctrl.signal.aborted) {
        rendered.forEach(r => URL.revokeObjectURL(r.blobUrl))
        return
      }
      const byKey = new Map(rendered.map(r => [r.minioKey, r.blobUrl]))
      for (const tile of tilesRef.current) {
        const newUrl = byKey.get(tile.minioKey)
        if (newUrl) onUpdateBlobUrl(tile.snapshotId, newUrl)
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        console.error('[viewport-catalog-refresh]', e)
      }
    }
  }, [onUpdateBlobUrl])

  // При смене года — загружаем весь каталог за год заново
  const prevYearRef = useRef<number | null>(null)
  useEffect(() => {
    if (prevYearRef.current === year) return
    prevYearRef.current = year
    // Чистим старые тайлы
    if (tilesRef.current.length > 0) {
      onRemoveMany(tilesRef.current.map(t => t.snapshotId))
      tilesRef.current = []
    }
    allRecordsRef.current = []
    catalogLoadedRef.current = false
    if (mapBboxRef.current) loadYear(year)
  }, [year, loadYear, onRemoveMany])

  // При изменении viewport — только локальная фильтрация + рендер новых тайлов (без API-запроса)
  useEffect(() => {
    if (!mapBbox) return
    // Если каталог ещё не загружен — инициализируем
    if (!catalogLoadedRef.current) {
      loadYear(year)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      renderViewport(mapBbox)
    }, CATALOG_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [mapBbox, year, renderViewport, loadYear])

  // Периодический рефреш blob URL
  useEffect(() => {
    if (!CATALOG_REFRESH_MS) return
    const id = setInterval(() => refresh(), CATALOG_REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      renderAbortRef.current?.abort()
      refreshAbortRef.current?.abort()
      yearAbortRef.current?.abort()
    }
  }, [])

  return state
}
