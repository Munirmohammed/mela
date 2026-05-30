import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '@/api/endpoints'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { formatETB } from '@/lib/utils'
import { ShoppingBag, Store, TrendingUp, Truck, CheckCircle, Zap } from 'lucide-react'
import { useState } from 'react'

const ZONES = ['BOLE', 'KIRKOS', 'YEKA', 'ARADA', 'LIDETA', 'NIFAS_SILK']

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'shops'>('overview')

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.analytics().then((r) => r.data.data),
    refetchInterval: 60000,
  })

  const { data: batches } = useQuery({
    queryKey: ['admin-batches'],
    queryFn: () => adminApi.batches().then((r) => r.data.data),
    enabled: activeTab === 'batches',
  })

  const { data: shops } = useQuery({
    queryKey: ['admin-shops'],
    queryFn: () => adminApi.shops().then((r) => r.data.data),
    enabled: activeTab === 'shops',
  })

  const triggerMutation = useMutation({
    mutationFn: (zone: string) => adminApi.triggerAggregation(zone),
    onSuccess: (_, zone) => toast.success(`Aggregation triggered for ${zone}`),
    onError: () => toast.error('Failed to trigger aggregation'),
  })

  const verifyMutation = useMutation({
    mutationFn: (id: string) => adminApi.verifyShop(id),
    onSuccess: () => toast.success('Shop verified'),
    onError: () => toast.error('Failed to verify shop'),
  })

  const kpis = [
    { label: 'Total Shops',    value: analytics?.totalShops || 0,                  icon: Store,       color: 'text-blue-400' },
    { label: 'Total Orders',   value: analytics?.totalOrders || 0,                 icon: ShoppingBag, color: 'text-purple-400' },
    { label: 'Revenue (ETB)',  value: formatETB(analytics?.totalRevenue || 0),      icon: TrendingUp,  color: 'text-green-400' },
    { label: 'Active Batches', value: analytics?.activeBatches || 0,               icon: Truck,       color: 'text-brand-400' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-500 text-xs">Mela Operations Center</p>
        </div>
        {analytics?.pendingVerifications > 0 && (
          <span className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-full">
            {analytics.pendingVerifications} pending
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="py-4">
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-card border border-surface-border rounded-xl p-1">
        {(['overview', 'batches', 'shops'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-white'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" /> Manual Aggregation Trigger
            </p>
            <p className="text-xs text-gray-500">Force-close the order window for a zone and create a delivery batch.</p>
            <div className="grid grid-cols-2 gap-2">
              {ZONES.map((zone) => (
                <Button key={zone} variant="secondary" size="sm"
                  loading={triggerMutation.isPending}
                  onClick={() => triggerMutation.mutate(zone)}>
                  {zone.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batches tab */}
      {activeTab === 'batches' && (
        <div className="space-y-3">
          {batches?.map((batch: any) => (
            <Card key={batch.id}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{batch.zone} Zone</p>
                    <p className="text-gray-500 text-xs">{batch.totalOrders} orders · Batch #{batch.id.slice(-6)}</p>
                  </div>
                  <StatusBadge status={batch.status} />
                </div>
                {batch.bulkList && (
                  <div className="bg-surface-muted rounded-xl p-3 space-y-1">
                    <p className="text-xs text-gray-400 font-medium mb-2">Bulk Purchase List</p>
                    {batch.bulkList.slice(0, 4).map((item: any) => (
                      <div key={item.productId} className="flex justify-between text-xs">
                        <span className="text-gray-300">{item.name}</span>
                        <span className="text-gray-500">{item.totalQty} {item.unit}</span>
                      </div>
                    ))}
                    {batch.bulkList.length > 4 && (
                      <p className="text-xs text-gray-600">+{batch.bulkList.length - 4} more items</p>
                    )}
                  </div>
                )}
                {batch.driver && (
                  <p className="text-xs text-gray-500">Driver: {batch.driver.name} · {batch.driver.vehicle}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {!batches?.length && (
            <p className="text-center text-gray-600 py-8 text-sm">No batches yet</p>
          )}
        </div>
      )}

      {/* Shops tab */}
      {activeTab === 'shops' && (
        <div className="space-y-3">
          {shops?.map((shop: any) => (
            <Card key={shop.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 bg-surface-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{shop.shopName}</p>
                  <p className="text-gray-500 text-xs">{shop.zone} · {shop._count.orders} orders · Score: {Math.round(shop.creditScore)}</p>
                </div>
                {!shop.isVerified ? (
                  <Button size="sm" loading={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(shop.id)}>
                    Verify
                  </Button>
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
