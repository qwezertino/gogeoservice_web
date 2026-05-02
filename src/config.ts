function envInt(key: string, fallback: number): number {
  const raw = import.meta.env[key]
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function envStr(key: string, fallback: string): string {
  const raw = import.meta.env[key]
  return raw ?? fallback
}

export const DEFAULT_WINDOW = envInt('VITE_DEFAULT_WINDOW', 5)  // ±дней поиска
export const DEFAULT_CLOUD  = envInt('VITE_DEFAULT_CLOUD', 20)  // макс. облачность %

/** 'esri' | 'osm' */
export const DEFAULT_BASEMAP = envStr('VITE_DEFAULT_BASEMAP', 'esri')

export const CATALOG_DEBOUNCE_MS   = envInt('VITE_CATALOG_DEBOUNCE_MS', 100)   // задержка после moveend
export const CATALOG_MAX_TILES     = envInt('VITE_CATALOG_MAX_TILES', 200)     // макс. тайлов в памяти
export const CATALOG_REFRESH_MS    = envInt('VITE_CATALOG_REFRESH_MS', 0)      // интервал обновления, 0 = выкл
