import { api } from './client'

// Auth
export const authApi = {
  register: (data: any)        => api.post('/auth/register', data),
  login: (phone: string)       => api.post('/auth/login', { phone }),
  verifyOtp: (data: any)       => api.post('/auth/verify-otp', data),
  refresh: (token: string)     => api.post('/auth/refresh', { refreshToken: token }),
  logout: ()                   => api.post('/auth/logout'),
}

// Products
export const productsApi = {
  list: (params?: any)         => api.get('/products', { params }),
  getById: (id: string)        => api.get(`/products/${id}`),
}

// Orders
export const ordersApi = {
  place: (data: any)           => api.post('/orders', data),
  list: ()                     => api.get('/orders'),
  getById: (id: string)        => api.get(`/orders/${id}`),
  cancel: (id: string)         => api.delete(`/orders/${id}`),
}

// Credit
export const creditApi = {
  getScore: ()                 => api.get('/credit/score'),
  applyLoan: (amount: number)  => api.post('/credit/apply', { amount }),
  repayLoan: (loanId: string)  => api.post(`/credit/repay/${loanId}`),
}

// Admin
export const adminApi = {
  analytics: ()                => api.get('/admin/analytics'),
  batches: ()                  => api.get('/admin/batches'),
  orders: (params?: any)       => api.get('/admin/orders', { params }),
  shops: ()                    => api.get('/admin/shops'),
  verifyShop: (id: string)     => api.put(`/admin/shops/${id}/verify`),
  addDriver: (data: any)       => api.post('/admin/drivers', data),
  triggerAggregation: (zone: string) => api.post('/admin/trigger-aggregation', { zone }),
  createProduct: (data: any)   => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  toggleProduct: (id: string)  => api.patch(`/products/${id}/toggle`),
}
