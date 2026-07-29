import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'
interface Toast { id: string; message: string; type: ToastType }
const ToastContext = createContext<{ showToast: (msg: string, type?: ToastType) => void } | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg animate-slide-up max-w-sm ${
            t.type === 'success' ? 'bg-success-600 text-white' : t.type === 'error' ? 'bg-error-600 text-white'
            : t.type === 'warning' ? 'bg-warning-500 text-white' : 'bg-primary-600 text-white'
          }`}>
            <span className="text-sm font-medium">{t.message}</span>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export function useToast() { const c = useContext(ToastContext); if (!c) throw new Error('useToast must be used within ToastProvider'); return c }
