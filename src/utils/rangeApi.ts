import type { BBox3857 } from '../types'

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

export interface RangeJobStatus {
  id: string
  status: 'running' | 'done' | 'error'
  done: number
  total: number
}

export interface RangeResult {
  date: string
  minio_key: string
}

export interface BatchImage {
  date: string
  blobUrl: string
  minio_key: string
}

export async function createRangeJob(
  bbox: BBox3857,
  startDate: string,
  endDate: string,
  maxCloudCover: number,
  polygon?: { lng: number; lat: number }[],
): Promise<string> {
  const { w, h } = calcOutputSize(bbox)
  const body: Record<string, unknown> = {
    bbox: [bbox.minX, bbox.minY, bbox.maxX, bbox.maxY],
    start_date: startDate,
    end_date: endDate,
    max_cloud_cover: maxCloudCover,
    w,
    h,
  }
  if (polygon && polygon.length >= 3) {
    body.polygon = polygon.map(p => [p.lng, p.lat])
  }

  const res = await fetch('/api/jobs/render-range', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(String(res.status))
  const data = await res.json() as { job_id: string }
  return data.job_id
}

export async function pollRangeJob(jobId: string): Promise<RangeJobStatus> {
  const res = await fetch(`/api/jobs/render-range/${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error(String(res.status))
  return res.json() as Promise<RangeJobStatus>
}

export async function getRangeResults(jobId: string): Promise<RangeResult[]> {
  const res = await fetch(`/api/jobs/render-range/${encodeURIComponent(jobId)}/results`)
  if (!res.ok) throw new Error(String(res.status))
  return res.json() as Promise<RangeResult[]>
}

export async function fetchBatchImages(items: RangeResult[]): Promise<BatchImage[]> {
  if (items.length === 0) return []
  console.log('[batchImages] sending', items.length, 'keys:', items.map(i => i.minio_key))
  const res = await fetch('/api/render/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items.map(i => ({ minio_key: i.minio_key }))),
  })
  console.log('[batchImages] response status:', res.status)
  if (!res.ok) throw new Error(String(res.status))
  const data = await res.json() as Array<{ index: number; data: string; cached: boolean }>
  console.log('[batchImages] parsed items:', data.length)

  return data.map(d => {
    const source = items[d.index]
    const date = source?.date ?? 'unknown'
    const minio_key = source?.minio_key ?? ''
    const binary = atob(d.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'image/png' })
    return { date, blobUrl: URL.createObjectURL(blob), minio_key }
  })
}
