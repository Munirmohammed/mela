import { prisma } from '../../prisma/client'

function tierFor(points: number): string {
  if (points >= 2000) return 'GOLD'
  if (points >= 500) return 'SILVER'
  return 'BRONZE'
}

export const loyaltyService = {
  async getAccount(shopId: string) {
    const account = await prisma.loyaltyAccount.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
      include: { ledger: { orderBy: { createdAt: 'desc' }, take: 20 } },
    })
    return account
  },

  /** Award (or deduct) points and append a ledger entry. Best-effort. */
  async award(shopId: string, points: number, reason: string) {
    if (!points) return
    const account = await prisma.loyaltyAccount.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
    })
    const newPoints = Math.max(0, account.points + points)
    await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, tier: tierFor(newPoints) },
      }),
      prisma.pointsLedger.create({
        data: { accountId: account.id, points, reason },
      }),
    ])
  },
}
