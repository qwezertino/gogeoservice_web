import { useState, useCallback, useRef } from 'react'
import type { BBox3857 } from '../types'
import { fetchNdvi } from '../utils/ndviApi'

export type NdviState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; imageUrl: string; provider: string | null }
  | { status: 'error'; message: string }

export function useNdviRequest() {
  const [state, setState] = useState<NdviState>({ status: 'idle' })
  const prevUrl = useRef<string | null>(null)

  const request = useCallback(async (
    bbox: BBox3857,
    date: string,
    window: number,
    cloud: number,
    polygon?: { lng: number; lat: number }[],
  ) => {
    setState({ status: 'loading' })
    try {
      const { blob, provider } = await fetchNdvi(bbox, date, window, cloud, polygon)
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
      const imageUrl = URL.createObjectURL(blob)
      prevUrl.current = imageUrl
      setState({ status: 'success', imageUrl, provider })
    } catch (e) {
      const code = e instanceof Error ? e.message : '500'
      let message: string
      if (code === '400') message = 'Некорректные параметры запроса'
      else if (code === '404') message = `Снимок не найден: нет сцены с облачностью ≤${cloud}% в диапазоне ±${window} дн. Попробуйте расширить окно поиска или увеличить допустимую облачность.`
      else if (code === '500') message = 'Ошибка обработки на сервере'
      else message = 'Сервис недоступен. Проверьте, запущен ли geogoservice.'
      setState({ status: 'error', message })
    }
  }, [])

  const reset = useCallback(() => {
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current)
      prevUrl.current = null
    }
    setState({ status: 'idle' })
  }, [])

  return { state, request, reset }
}
