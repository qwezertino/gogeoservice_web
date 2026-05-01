import { useEffect, useState, useCallback } from 'react'
import type { ToastMessage } from '../../types'

interface ToastProps {
  messages: ToastMessage[]
  onRemove: (id: number) => void
}

export function Toast({ messages, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {messages.map(msg => (
        <ToastItem key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ message, onRemove }: { message: ToastMessage; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(message.id), 300)
    }, 5000)
    return () => clearTimeout(timer)
  }, [message.id, onRemove])

  const bg =
    message.type === 'success' ? 'bg-green-700' :
    message.type === 'error'   ? 'bg-red-700' :
                                 'bg-gray-700'

  return (
    <div
      className={`pointer-events-auto max-w-sm px-4 py-3 rounded-lg text-white text-sm shadow-lg transition-all duration-300 ${bg} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      {message.text}
    </div>
  )
}

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const idRef = { current: 0 }

  const show = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = ++idRef.current
    setMessages(prev => [...prev, { id, type, text }])
  }, [])

  const remove = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  return { messages, show, remove }
}
