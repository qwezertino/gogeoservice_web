import type { LngLat } from '../types'
import type { BBox3857 } from '../types'
import { lngLatToMeters } from './projection'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Обрезает прямоугольный PNG по форме полигона.
 * Точки полигона передаются в WGS84 (LngLat).
 * Возвращает новый blob URL с маскированным изображением.
 */
export async function maskImageToPolygon(
  imageUrl: string,
  bbox: BBox3857,
  points: LngLat[]
): Promise<string> {
  const img = await loadImage(imageUrl)
  const w = img.naturalWidth
  const h = img.naturalHeight

  // Проецируем точки полигона в пиксельные координаты изображения
  const pixelPoints = points.map(p => {
    const [mx, my] = lngLatToMeters(p.lng, p.lat)
    return {
      x: ((mx - bbox.minX) / (bbox.maxX - bbox.minX)) * w,
      // Y инвертирован: верх изображения = maxY
      y: ((bbox.maxY - my) / (bbox.maxY - bbox.minY)) * h,
    }
  })

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Clip по полигону
  ctx.beginPath()
  ctx.moveTo(pixelPoints[0].x, pixelPoints[0].y)
  for (let i = 1; i < pixelPoints.length; i++) {
    ctx.lineTo(pixelPoints[i].x, pixelPoints[i].y)
  }
  ctx.closePath()
  ctx.clip()

  ctx.drawImage(img, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('canvas.toBlob failed')); return }
      resolve(URL.createObjectURL(blob))
    }, 'image/png')
  })
}
