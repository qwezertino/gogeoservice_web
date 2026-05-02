export interface BBox3857 {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface BBox4326 {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface NdviRequestParams {
  bbox: BBox3857
  date: string // YYYY-MM-DD
  w: number
  h: number
}

export type ValidationError =
  | 'too_few_points'
  | 'too_small'
  | 'too_large'
  | null

export interface ZoneValidation {
  valid: boolean
  error: ValidationError
  widthM: number
  heightM: number
}

export interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'info'
  text: string
}

export interface Snapshot {
  id: number
  label: string          // "Снимок #N · YYYY-MM-DD"
  maskedImageUrl: string // blob URL
  bbox: BBox3857
  date: string
  minioKey?: string      // присутствует только для тайлов из каталога БД  source?: 'catalog'     // отсутсвует у ручных снимков}

/** Запись из /api/catalog (координаты bbox в EPSG:3857) */
export interface TileRecord {
  bbox_minx: number
  bbox_miny: number
  bbox_maxx: number
  bbox_maxy: number
  date_acquired: string  // YYYY-MM-DD
  width: number
  height: number
  minio_key: string
}
