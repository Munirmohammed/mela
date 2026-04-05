import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Clock, Truck } from 'lucide-react'
import { ordersApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { formatETB, formatDate, formatTime } from '@/lib/utils'

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED']

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id!).then((r) => r.data.data),
    refetchInterval: 30000, // poll every 30s
  })

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(id!),
    onSuccess: () => {
      toast.success('Order cancelled')
      qc.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Cannot cancel'),
  })

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-surface-card rounded-xl w-1/3" />
      <div className="h-32 bg-surface-card rounded-2xl" />
      <div className="h-48 bg-surface-card rounded-2xl" />
    </div>
  )

  if (!order) return null

  const currentStep = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')}
          className="w-9 h-9 bg-surface-card border border-surface-border rounded-xl flex items-center justify-center hover:bg-surface-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div>
          <h1 className="text-white font-semibold">Order #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-gray-500 text-xs">{formatDate(order.createdAt)} at {formatTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} className="ml-auto" />
      </div>

      {/* Progress tracker */}
      {order.status !== 'CANCELLED' && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-4 h-0.5 bg-surface-muted mx-8" />
              <div
                className="absolute left-0 top-4 h-0.5 bg-brand-500 mx-8 transition-all duration-500"
                style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
              />
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex flex-col items-center gap-1.5 relative z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    i <= currentStep
                      ? 'bg-brand-500 border-brand-500 shadow-lg shadow-brand-500/30'
                      : 'bg-surface border-surface-muted'
                  }`}>
                    {i < currentStep
                      ? <span className="text-white text-xs">✓</span>
                      : <span className={`text-xs font-bold ${i === currentStep ? 'text-white' : 'text-gray-600'}`}>{i + 1}</span>
                    }
                  </div>
                  <span className={`text-[9px] font-medium ${i <= currentStep ? 'text-brand-400' : 'text-gray-600'}`}>
                    {step.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery info */}
      {order.batch && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="flex items-center gap-3 py-3">
            <Truck className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white">
                {order.status === 'IN_TRANSIT' ? 'Out for delivery' : `Delivery scheduled`}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(order.batch.scheduledAt)} morning
                {order.batch.driver && ` · Driver: ${order.batch.driver.name}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium text-gray-300">Items ({order.items.length})</p>
          {order.items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">{item.product.name}</p>
                <p className="text-gray-500 text-xs">{item.quantity} × {formatETB(item.unitPrice)}</p>
              </div>
              <p className="text-white text-sm font-medium">{formatETB(item.quantity * item.unitPrice)}</p>
            </div>
          ))}
          <div className="border-t border-surface-border pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Delivery fee</span><span>{formatETB(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-white">
              <span>Total</span><span className="text-brand-400">{formatETB(order.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel */}
      {['PENDING', 'CONFIRMED'].includes(order.status) && (
        <Button variant="danger" className="w-full" loading={cancelMutation.isPending}
          onClick={() => cancelMutation.mutate()}>
          Cancel Order
        </Button>
      )}
    </div>
  )
}
