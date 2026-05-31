import { prisma } from '../prisma/client'

/** True when an integration DB is configured; suites skip otherwise. */
export const HAS_DB = Boolean(process.env.TEST_DATABASE_URL)

/** Wipe all tables between tests (FK-safe via CASCADE). */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
      "WalletTransaction","Wallet","ProofOfDelivery","DeliveryStop","DriverLocation",
      "OutboxEvent","Payment","OrderItem","Order","DeliveryBatch","Loan","Notification",
      "Driver","Shop","User","OtpCode","AuditLog","Product"
     RESTART IDENTITY CASCADE`
  )
}

let counter = 0
function uniquePhone(): string {
  counter += 1
  return `+25190000${String(1000 + counter).slice(-4)}`
}

/** Create a verified shop owner (+ user) for use as a fixture. */
export async function makeShop(overrides: Partial<{ creditScore: number; creditLimit: number }> = {}) {
  const phone = uniquePhone()
  const user = await prisma.user.create({
    data: {
      phone,
      role: 'SHOP_OWNER',
      shop: {
        create: {
          ownerName: 'Test Owner',
          shopName: 'Test Shop',
          phone,
          zone: 'BOLE',
          address: 'Test address',
          isVerified: true,
          creditScore: overrides.creditScore ?? 70,
          creditLimit: overrides.creditLimit ?? 5000,
        },
      },
    },
    include: { shop: true },
  })
  return { user, shop: user.shop! }
}

/** Create a simple PENDING order for a shop. */
export async function makeOrder(shopId: string, totalAmount = 200) {
  return prisma.order.create({
    data: {
      shopId,
      totalAmount,
      deliveryFee: 30,
      paymentMethod: 'CHAPA',
      scheduledFor: new Date('2026-06-01T18:00:00Z'),
    },
  })
}

export { prisma }
