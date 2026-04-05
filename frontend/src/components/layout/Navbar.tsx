import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Package, CreditCard, User, LayoutDashboard } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const shopLinks = [
  { to: '/',        icon: Package,       label: 'Catalog' },
  { to: '/orders',  icon: ShoppingCart,  label: 'Orders' },
  { to: '/credit',  icon: CreditCard,    label: 'Credit' },
  { to: '/profile', icon: User,          label: 'Profile' },
]

export function Navbar() {
  const location = useLocation()
  const count = useCartStore((s) => s.count())
  const role = useAuthStore((s) => s.role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card/95 backdrop-blur border-t border-surface-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {shopLinks.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <Link key={to} to={to} className={cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors',
              active ? 'text-brand-500' : 'text-gray-500 hover:text-gray-300'
            )}>
              <div className="relative">
                <Icon className="w-5 h-5" />
                {to === '/orders' && count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        {role === 'ADMIN' && (
          <Link to="/admin" className={cn(
            'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors',
            location.pathname.startsWith('/admin') ? 'text-brand-500' : 'text-gray-500 hover:text-gray-300'
          )}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Admin</span>
          </Link>
        )}
      </div>
    </nav>
  )
}

export function Topbar({ title }: { title: string }) {
  const count = useCartStore((s) => s.count())
  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-surface-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-brand-500 font-bold text-xl">ሜላ</span>
        <span className="text-gray-600 text-sm">|</span>
        <span className="text-white font-medium text-sm">{title}</span>
      </div>
      <Link to="/cart" className="relative p-2 rounded-xl hover:bg-surface-card transition-colors">
        <ShoppingCart className="w-5 h-5 text-gray-400" />
        {count > 0 && (
          <span className="absolute top-1 right-1 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </header>
  )
}
