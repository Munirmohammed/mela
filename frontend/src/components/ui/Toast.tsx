import { create } from 'zustand'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: Toast[]
  add: (type: ToastType, message: string) => void
  remove: (id: string) => void
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  add: (type, message) => {
    const id = Math.random().toString(36).slice(2)
    set({ toasts: [...get().toasts, { id, type, message }] })
    setTimeout(() => get().remove(id), 4000)
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (msg: string) => useToast.getState().add('success', msg),
  error:   (msg: string) => useToast.getState().add('error', msg),
  info:    (msg: string) => useToast.getState().add('info', msg),
}

const icons = {
  success: <CheckCircle className="w-4 h-4 text-green-400" />,
  error:   <XCircle className="w-4 h-4 text-red-400" />,
  info:    <AlertCircle className="w-4 h-4 text-blue-400" />,
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const remove = useToast((s) => s.remove)
  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-slide-up',
      'bg-surface-card border-surface-border min-w-[280px] max-w-[380px]'
    )}>
      {icons[t.type]}
      <p className="text-sm text-white flex-1">{t.message}</p>
      <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-white transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToast((s) => s.toasts)
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
