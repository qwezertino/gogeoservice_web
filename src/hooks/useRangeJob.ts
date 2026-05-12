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
  const fetchedKeysRef = useRef(new Set<string>())

  const submit = useCallback(async (
    bbox: BBox3857,
    startDate: string,
    endDate: string,
    cloud: number,
    polygon?: LngLat[],
  ) => {
    cancelledRef.current = false
    fetchedKeysRef.current = new Set()
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

    console.log('[rangeJob] started polling', jobId)
    setState({ phase: 'running', jobId, done: 0, total: 0 })

    while (!cancelledRef.current) {
      await sleep(POLL_MS)
      if (cancelledRef.current) break

      // Poll status
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

      // Fetch any newly available results (incremental)
      try {
        const results = await getRangeResults(jobId)
        if (cancelledRef.current) break
        const newResults = results.filter(r => !fetchedKeysRef.current.has(r.minio_key))
        if (newResults.length > 0) {
          // One batch request per poll tick — only new keys
          const images = await fetchBatchImages(newResults)
          if (cancelledRef.current) break
          for (const img of images) {
            fetchedKeysRef.current.add(img.minio_key)
            onSnapshot(img.date, img.blobUrl, bbox, img.minio_key, groupId)
          }
        }
      } catch {
        // Results endpoint not ready yet — keep polling
      }

      if (status.status === 'done') {
        setState({ phase: 'done', count: fetchedKeysRef.current.size })
        break
      }
    }
  }, [onSnapshot])

  const cancel = useCallback(() => {
    cancelledRef.current = true
    setState({ phase: 'idle' })
  }, [])

  const reset = useCallback(() => {
    cancelledRef.current = true
    setState({ phase: 'idle' })
    fetchedKeysRef.current = new Set()
  }, [])

  return { state, submit, cancel, reset }
}

