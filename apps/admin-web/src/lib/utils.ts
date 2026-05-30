import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatETB(amount: number) {
  return `${amount.toLocaleString('en-ET')} ETB`
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-ET', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-ET', {
    hour: '2-digit', minute: '2-digit',
  })
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  CONFIRMED:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  IN_TRANSIT:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DELIVERED:   'bg-green-500/15 text-green-400 border-green-500/30',
  CANCELLED:   'bg-red-500/15 text-red-400 border-red-500/30',
  AGGREGATING: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  PURCHASING:  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  ACTIVE:      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  REPAID:      'bg-green-500/15 text-green-400 border-green-500/30',
  DEFAULTED:   'bg-red-500/15 text-red-400 border-red-500/30',
}
