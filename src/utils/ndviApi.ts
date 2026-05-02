import type { BBox3857 } from '../types'
import { DEFAULT_WINDOW, DEFAULT_CLOUD } from '../config'

const MAX_DIM = 512

function calcOutputSize(bbox: BBox3857): { w: number; h: number } {
  const widthM = bbox.maxX - bbox.minX
  const heightM = bbox.maxY - bbox.minY
  const aspect = widthM / heightM

  let w: number, h: number
  if (aspect >= 1) {
    w = MAX_DIM
    h = Math.max(1, Math.round(MAX_DIM / aspect))
  } else {
    h = MAX_DIM
    w = Math.max(1, Math.round(MAX_DIM * aspect))
  }
  return { w, h }
}

export async function fetchNdvi(
  bbox: BBox3857,
  date: string,
  window: number = DEFAULT_WINDOW,
  cloud: number = DEFAULT_CLOUD,
  polygon?: { lng: number; lat: number }[],
): Promise<{ blob: Blob; provider: string | null }> {
  const { w, h } = calcOutputSize(bbox)
  const bboxStr = `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}`
  let url = `/api/render?bbox=${bboxStr}&date=${date}&w=${w}&h=${h}&window=${window}&cloud=${cloud}`
  if (polygon && polygon.length >= 3) {
    url += `&polygon=${polygon.map(p => `${p.lng},${p.lat}`).join(',')}`
  }

  const res = await fetch(url)
  const provider = res.headers.get('X-STAC-Provider')

  if (!res.ok) {
    if (res.status === 400) throw new Error('400')
    if (res.status === 404) throw new Error('404')
    throw new Error('500')
  }

  const blob = await res.blob()
  return { blob, provider }
}
