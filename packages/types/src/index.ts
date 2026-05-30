/**
 * @mela/types — the single source of truth for domain types shared across the
 * API, the admin/supplier web apps, and the Expo mobile apps.
 *
 * Framework-free on purpose: no Prisma, no React, no axios imports here, so any
 * client can depend on it. Enums are declared as `as const` arrays so they are
 * usable both as runtime values (dropdowns, validation) and as union types.
 * Keep these in sync with `apps/api/prisma/schema.prisma`.
 */

// ---------------------------------------------------------------------------
// Enums (runtime arrays + derived union types)
// ---------------------------------------------------------------------------

export const ROLES = ['SHOP_OWNER', 'DRIVER', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const ZONES = ['BOLE', 'KIRKOS', 'YEKA', 'ARADA', 'LIDETA', 'NIFAS_SILK'] as const
export type Zone = (typeof ZONES)[number]

export const CATEGORIES = [
  'GRAINS',
  'OILS_FATS',
  'CLEANING',
  'BEVERAGES',
  'DAIRY',
  'SNACKS',
  'SPICES',
  'OTHER',
] as const
export type Category = (typeof CATEGORIES)[number]

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const BATCH_STATUSES = ['AGGREGATING', 'PURCHASING', 'IN_TRANSIT', 'DELIVERED'] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const PAYMENT_METHODS = ['CASH', 'CHAPA', 'CREDIT'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ['UNPAID', 'PAID'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const LOAN_STATUSES = ['ACTIVE', 'REPAID', 'DEFAULTED'] as const
export type LoanStatus = (typeof LOAN_STATUSES)[number]

// Human-friendly labels for UI (Amharic added incrementally in the i18n layer).
export const ZONE_LABELS: Record<Zone, string> = {
  BOLE: 'Bole',
  KIRKOS: 'Kirkos',
  YEKA: 'Yeka',
  ARADA: 'Arada',
  LIDETA: 'Lideta',
  NIFAS_SILK: 'Nifas Silk',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  GRAINS: 'Grains',
  OILS_FATS: 'Oils & Fats',
  CLEANING: 'Cleaning',
  BEVERAGES: 'Beverages',
  DAIRY: 'Dairy',
  SNACKS: 'Snacks',
  SPICES: 'Spices',
  OTHER: 'Other',
}

// ---------------------------------------------------------------------------
// Domain DTOs (JSON shapes — dates are ISO strings over the wire)
// ---------------------------------------------------------------------------

export type ISODateString = string

export interface Product {
  id: string
  name: string
  nameAm: string
  description?: string | null
  category: Category
  unit: string
  wholesalePrice: number
  retailPrice: number
  minOrderQty: number
  imageUrl?: string | null
  isAvailable: boolean
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  product?: Product
}

export interface Order {
  id: string
  shopId: string
  status: OrderStatus
  items: OrderItem[]
  totalAmount: number
  deliveryFee: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  chapaRef?: string | null
  batchId?: string | null
  scheduledFor: ISODateString
  notes?: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Shop {
  id: string
  userId: string
  ownerName: string
  shopName: string
  phone: string
  zone: Zone
  address: string
  lat?: number | null
  lng?: number | null
  isVerified: boolean
  creditScore: number
  creditLimit: number
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

export interface Driver {
  id: string
  name: string
  phone: string
  vehicle: string
  plateNo: string
  isActive: boolean
}

export interface DeliveryBatch {
  id: string
  zone: Zone
  status: BatchStatus
  driverId?: string | null
  driver?: Driver | null
  route?: unknown
  bulkList?: unknown
  totalOrders: number
  scheduledAt: ISODateString
  startedAt?: ISODateString | null
  deliveredAt?: ISODateString | null
}

export interface Loan {
  id: string
  shopId: string
  amount: number
  fee: number
  status: LoanStatus
  dueDate: ISODateString
  repaidAt?: ISODateString | null
  createdAt: ISODateString
}

export interface CreditScore {
  creditScore: number
  creditLimit: number
  availableCredit: number
  loans: Loan[]
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface RegisterInput {
  phone: string
  ownerName: string
  shopName: string
  zone: Zone
  address: string
  lat?: number
  lng?: number
}

export interface VerifyOtpInput {
  phone: string
  code: string
}

export interface PlaceOrderItemInput {
  productId: string
  quantity: number
}

export interface PlaceOrderInput {
  items: PlaceOrderItemInput[]
  paymentMethod: PaymentMethod
  notes?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  role: Role
}

// ---------------------------------------------------------------------------
// Transport envelope used by the API
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiErrorBody {
  success: false
  message: string
  errors?: { field: string; message: string }[]
}
