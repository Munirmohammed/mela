import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import { ordersApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatETB, formatDate } from '@/lib/utils'

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list().then((r) => r.data.data),
  })

  if (isLoading) return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-surface-card border border-surface-border rounded-2xl h-24 animate-pulse" />
      ))}
    </div>
  )

  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <Package className="w-12 h-12 text-gray-700 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">No orders yet</h2>
      <p className="text-gray-500 text-sm">Your orders will appear here</p>
    </div>
  )

  return (
    <div className="space-y-3 animate-fade-in">
      {data.map((order: any) => (
        <Link key={order.id} to={`/orders/${order.id}`}>
          <Card hover>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 bg-surface-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white text-sm font-medium">Order #{order.id.slice(-6).toUpperCase()}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-gray-500 text-xs">
                  {order.items.length} items · {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-brand-400 font-semibold text-sm">{formatETB(order.totalAmount)}</p>
                <ChevronRight className="w-4 h-4 text-gray-600 ml-auto mt-1" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
