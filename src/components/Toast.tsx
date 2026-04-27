import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface ToastItem {
  id: string
  message: string
}

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const showToast = useCallback((message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => dismiss(id), 20000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none items-center">
        {toasts.map(t => (
          <div key={t.id}
            className="bg-surface border border-border text-ink text-[11px] p-2 flex items-start gap-2 max-w-[260px] pointer-events-auto">
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink flex-shrink-0 leading-none">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
