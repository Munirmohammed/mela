import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600',
            'focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-colors',
            icon && 'pl-10',
            error && 'border-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
