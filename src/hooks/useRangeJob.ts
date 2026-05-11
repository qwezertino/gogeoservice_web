import { useState, useCallback, useRef } from 'react'
import type { BBox3857, LngLat } from '../types'
import {
  createRangeJob,
  pollRangeJob,
  getRangeResults,
  fetchBatchImages,
  type RangeJobStatus,
} from '../utils/rangeApi'

export type RangeJobState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'running'; jobId: string; done: number; total: number }
  | { phase: 'done'; count: number }
  | { phase: 'error'; message: string }

const POLL_MS = 2500
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function useRangeJob(
  onSnapshot: (date: string, blobUrl: string, bbox: BBox3857, minioKey: string, groupId: number) => void,
) {
  const [state, setState] = useState<RangeJobState>({ phase: 'idle' })
  const cancelledRef = useRef(false)

  const submit = useCallback(async (
    bbox: BBox3857,
    startDate: string,
    endDate: string,
    cloud: number,
    polygon?: LngLat[],
  ) => {
    cancelledRef.current = false
    const groupId = Date.now()
    setState({ phase: 'submitting' })

    let jobId: string
    try {
      jobId = await createRangeJob(
        bbox, startDate, endDate, cloud,
        polygon?.map(p => ({ lng: p.lng, lat: p.lat })),
      )
    } catch {
      setState({ phase: 'error', message: 'Не удалось создать задание на сервере' })
      return
    }

    setState({ phase: 'running', jobId, done: 0, total: 0 })
    console.log('[rangeJob] started polling', jobId)

    // Poll status only — no incremental result fetching
    while (!cancelledRef.current) {
      await sleep(POLL_MS)
      if (cancelledRef.current) break

      let status: RangeJobStatus
      try {
        status = await pollRangeJob(jobId)
      } catch {
        setState({ phase: 'error', message: 'Ошибка при опросе статуса задания' })
        return
      }
      if (cancelledRef.current) break

      console.log('[rangeJob] poll:', status.status, status.done, '/', status.total)
      setState({ phase: 'running', jobId, done: status.done, total: status.total })

      if (status.status === 'error') {
        setState({ phase: 'error', message: 'Ошибка рендера на сервере' })
        return
      }

      if (status.status === 'done') {
        console.log('[rangeJob] status=done, fetching results')
        break
      }
    }

    if (cancelledRef.current) return

    // One batch request with ALL keys at once
    try {
      const results = await getRangeResults(jobId)
      console.log('[rangeJob] results count:', results.length, results.map(r => r.date))
      if (cancelledRef.current) return
      const images = await fetchBatchImages(results)
      console.log('[rangeJob] batch images received:', images.length)
      if (cancelledRef.current) return
      for (const img of images) {
        onSnapshot(img.date, img.blobUrl, bbox, img.minio_key, groupId)
      }
      setState({ phase: 'done', count: images.length })
    } catch (e) {
      console.error('[rangeJob] error loading results:', e)
      setState({ phase: 'error', message: 'Не удалось загрузить результаты' })
    }
  }, [onSnapshot])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setState({ phase: 'idle' })
  }, [])

  const reset = useCallback(() => {
    cancelledRef.current = true
    setState({ phase: 'idle' })
  }, [])

  return { state, submit, cancel, reset }
}
