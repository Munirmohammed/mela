import { Outlet, useLocation } from 'react-router-dom'
import { Navbar, Topbar } from './Navbar'

const PAGE_TITLES: Record<string, string> = {
  '/':        'Catalog',
  '/cart':    'Cart',
  '/orders':  'My Orders',
  '/credit':  'Credit',
  '/profile': 'Profile',
}

export function AppLayout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Mela'

  return (
    <div className="min-h-screen bg-surface text-white">
      <Topbar title={title} />
      <main className="pb-24 md:pb-6 max-w-2xl mx-auto px-4 py-4">
        <Outlet />
      </main>
      <Navbar />
    </div>
  )
}
