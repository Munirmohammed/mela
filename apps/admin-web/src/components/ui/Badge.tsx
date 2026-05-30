import { cn, STATUS_COLORS } from '@/lib/utils'

interface BadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      STATUS_COLORS[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      className
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {label || status.replace('_', ' ')}
    </span>
  )
}
