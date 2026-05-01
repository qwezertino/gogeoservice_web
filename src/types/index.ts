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
