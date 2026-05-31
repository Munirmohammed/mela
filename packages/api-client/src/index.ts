/**
 * @mela/api-client — shared, framework-agnostic HTTP client for every Mela
 * surface (admin web, supplier web, shop mobile, driver mobile).
 *
 * Token storage and refresh side-effects are injected via `MelaApiConfig`, so
 * the web apps can wire it to a Zustand store + redirect, and the mobile apps
 * can wire it to expo-secure-store + navigation — without changing this file.
 */
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type {
  ApiResponse,
  AuthTokens,
  CreditScore,
  DeliveryBatch,
  Loan,
  Order,
  PlaceOrderInput,
  Product,
  RegisterInput,
  Shop,
  TrackingInfo,
  VerifyOtpInput,
  Zone,
} from '@mela/types'

export interface MelaApiConfig {
  /** API base URL. Defaults to `/api/v1` (works behind the web dev proxy). */
  baseURL?: string
  getAccessToken: () => string | null | undefined
  getRefreshToken: () => string | null | undefined
  /** Persist new tokens after a successful silent refresh. */
  onTokens: (tokens: AuthTokens) => void
  /** Called when refresh fails — clear session, navigate to auth, etc. */
  onAuthFailure: () => void
}

type Unwrapped<T> = Promise<T>

/** Pull `data.data` out of the API envelope so callers get the payload directly. */
function unwrap<T>(p: Promise<{ data: ApiResponse<T> }>): Unwrapped<T> {
  return p.then((r) => r.data.data)
}

export interface MelaApi {
  /** The underlying axios instance (escape hatch for not-yet-typed calls). */
  raw: AxiosInstance
  auth: {
    register: (data: RegisterInput) => Unwrapped<{ otpSent: boolean }>
    login: (phone: string) => Unwrapped<{ otpSent: boolean }>
    verifyOtp: (data: VerifyOtpInput) => Unwrapped<AuthTokens>
    refresh: (refreshToken: string) => Unwrapped<AuthTokens>
    logout: () => Unwrapped<unknown>
  }
  products: {
    list: (params?: { category?: string; search?: string }) => Unwrapped<Product[]>
    getById: (id: string) => Unwrapped<Product>
    create: (data: Partial<Product>) => Unwrapped<Product>
    update: (id: string, data: Partial<Product>) => Unwrapped<Product>
    toggle: (id: string) => Unwrapped<Product>
  }
  orders: {
    place: (data: PlaceOrderInput) => Unwrapped<Order>
    list: () => Unwrapped<Order[]>
    getById: (id: string) => Unwrapped<Order>
    cancel: (id: string) => Unwrapped<Order>
  }
  credit: {
    getScore: () => Unwrapped<CreditScore>
    applyLoan: (amount: number) => Unwrapped<Loan>
    repayLoan: (loanId: string) => Unwrapped<Loan>
  }
  shop: {
    me: () => Unwrapped<Shop>
    update: (data: Partial<Shop>) => Unwrapped<Shop>
  }
  delivery: {
    track: (orderId: string) => Unwrapped<TrackingInfo>
    myBatch: () => Unwrapped<DeliveryBatch | null>
    startBatch: (batchId: string) => Unwrapped<DeliveryBatch>
    arrive: (stopId: string) => Unwrapped<unknown>
    deliver: (stopId: string, pod: Record<string, unknown>) => Unwrapped<unknown>
    pushLocation: (batchId: string, lat: number, lng: number) => Unwrapped<unknown>
  }
  admin: {
    analytics: () => Unwrapped<Record<string, number>>
    batches: () => Unwrapped<DeliveryBatch[]>
    orders: (params?: { zone?: Zone; status?: string; page?: number }) => Unwrapped<Order[]>
    shops: () => Unwrapped<Shop[]>
    verifyShop: (id: string) => Unwrapped<Shop>
    addDriver: (data: Record<string, unknown>) => Unwrapped<unknown>
    triggerAggregation: (zone: string) => Unwrapped<unknown>
  }
}

export function createMelaApi(config: MelaApiConfig): MelaApi {
  const baseURL = config.baseURL ?? '/api/v1'
  const http = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } })

  http.interceptors.request.use((cfg) => {
    const token = config.getAccessToken()
    if (token) cfg.headers.Authorization = `Bearer ${token}`
    return cfg
  })

  http.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true
        try {
          const refreshToken = config.getRefreshToken()
          const { data } = await axios.post<ApiResponse<AuthTokens>>(`${baseURL}/auth/refresh`, {
            refreshToken,
          })
          config.onTokens(data.data)
          original.headers = original.headers ?? {}
          ;(original.headers as Record<string, string>).Authorization =
            `Bearer ${data.data.accessToken}`
          return http(original)
        } catch {
          config.onAuthFailure()
        }
      }
      return Promise.reject(error)
    }
  )

  return {
    raw: http,
    auth: {
      register: (data) => unwrap(http.post('/auth/register', data)),
      login: (phone) => unwrap(http.post('/auth/login', { phone })),
      verifyOtp: (data) => unwrap(http.post('/auth/verify-otp', data)),
      refresh: (refreshToken) => unwrap(http.post('/auth/refresh', { refreshToken })),
      logout: () => unwrap(http.post('/auth/logout')),
    },
    products: {
      list: (params) => unwrap(http.get('/products', { params })),
      getById: (id) => unwrap(http.get(`/products/${id}`)),
      create: (data) => unwrap(http.post('/products', data)),
      update: (id, data) => unwrap(http.put(`/products/${id}`, data)),
      toggle: (id) => unwrap(http.patch(`/products/${id}/toggle`)),
    },
    orders: {
      place: (data) => unwrap(http.post('/orders', data)),
      list: () => unwrap(http.get('/orders')),
      getById: (id) => unwrap(http.get(`/orders/${id}`)),
      cancel: (id) => unwrap(http.delete(`/orders/${id}`)),
    },
    credit: {
      getScore: () => unwrap(http.get('/credit/score')),
      applyLoan: (amount) => unwrap(http.post('/credit/apply', { amount })),
      repayLoan: (loanId) => unwrap(http.post(`/credit/repay/${loanId}`)),
    },
    shop: {
      me: () => unwrap(http.get('/shops/me')),
      update: (data) => unwrap(http.put('/shops/me', data)),
    },
    delivery: {
      track: (orderId) => unwrap(http.get(`/delivery/track/${orderId}`)),
      myBatch: () => unwrap(http.get('/delivery/batch')),
      startBatch: (batchId) => unwrap(http.post(`/delivery/batches/${batchId}/start`)),
      arrive: (stopId) => unwrap(http.post(`/delivery/stops/${stopId}/arrive`)),
      deliver: (stopId, pod) => unwrap(http.post(`/delivery/stops/${stopId}/deliver`, pod)),
      pushLocation: (batchId, lat, lng) =>
        unwrap(http.post('/delivery/location', { batchId, lat, lng })),
    },
    admin: {
      analytics: () => unwrap(http.get('/admin/analytics')),
      batches: () => unwrap(http.get('/admin/batches')),
      orders: (params) => unwrap(http.get('/admin/orders', { params })),
      shops: () => unwrap(http.get('/admin/shops')),
      verifyShop: (id) => unwrap(http.put(`/admin/shops/${id}/verify`)),
      addDriver: (data) => unwrap(http.post('/admin/drivers', data)),
      triggerAggregation: (zone) => unwrap(http.post('/admin/trigger-aggregation', { zone })),
    },
  }
}
