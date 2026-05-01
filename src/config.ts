function envInt(key: string, fallback: number): number {
  const raw = import.meta.env[key]
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

export const DEFAULT_WINDOW = envInt('VITE_DEFAULT_WINDOW', 5)  // ±дней поиска
export const DEFAULT_CLOUD  = envInt('VITE_DEFAULT_CLOUD', 20)  // макс. облачность %
