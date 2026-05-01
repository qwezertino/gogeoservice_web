import type { BBox3857, ZoneValidation, ValidationError } from '../types'

const MIN_SIDE_M = 100
const MAX_SIDE_M = 500_000

export function validateBBox(bbox: BBox3857, pointCount: number): ZoneValidation {
  const widthM = bbox.maxX - bbox.minX
  const heightM = bbox.maxY - bbox.minY

  let error: ValidationError = null

  if (pointCount < 3) {
    error = 'too_few_points'
  } else if (widthM < MIN_SIDE_M || heightM < MIN_SIDE_M) {
    error = 'too_small'
  } else if (widthM > MAX_SIDE_M || heightM > MAX_SIDE_M) {
    error = 'too_large'
  }

  return { valid: error === null, error, widthM, heightM }
}

export function validationErrorText(error: ValidationError): string {
  switch (error) {
    case 'too_few_points':
      return 'Минимум 3 точки (треугольник)'
    case 'too_small':
      return `Геозона слишком маленькая (минимум ${MIN_SIDE_M} м по стороне)`
    case 'too_large':
      return `Геозона слишком большая (максимум ${MAX_SIDE_M / 1000} км по стороне)`
    default:
      return ''
  }
}
