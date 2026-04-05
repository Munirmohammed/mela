import { prisma } from '../../prisma/client'
import { AppError, NotFoundError } from '../../utils/AppError'

const LOAN_FEE_RATE = 0.07 // 7% flat fee
const CREDIT_TIERS = [
  { minScore: 70, limit: 10000 },
  { minScore: 60, limit: 5000 },
  { minScore: 50, limit: 2000 },
  { minScore: 0, limit: 0 },
]

export const creditService = {
  async getScore(userId: string) {
    const shop = await prisma.shop.findUnique({
      where: { userId },
      include: { orders: true, loans: true },
    })
    if (!shop) throw new NotFoundError('Shop')

    return {
      score: shop.creditScore,
      limit: shop.creditLimit,
      availableCredit: shop.creditLimit,
      loans: shop.loans,
    }
  },

  async recalculate(shopId: string) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { orders: true, loans: true },
    })
    if (!shop) return

    const totalOrders = shop.orders.length
    const completedOrders = shop.orders.filter((o) => o.status === 'DELIVERED').length
    const totalLoans = shop.loans.length
    const repaidLoans = shop.loans.filter((l) => l.status === 'REPAID').length
    const defaults = shop.loans.filter((l) => l.status === 'DEFAULTED').length

    const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0
    const repaymentRate = totalLoans > 0 ? repaidLoans / totalLoans : 1

    // Account age bonus (up to 10 points)
    const ageMonths = (Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const agebonus = Math.min(ageMonths * 2, 10)

    // Volume bonus (up to 10 points)
    const volumeBonus = Math.min(totalOrders * 0.5, 10)

    const score = Math.max(
      0,
      completionRate * 40 +
      repaymentRate * 40 +
      agebonus +
      volumeBonus -
      defaults * 15
    )

    const tier = CREDIT_TIERS.find((t) => score >= t.minScore)!
    const creditLimit = tier.limit

    await prisma.shop.update({
      where: { id: shopId },
      data: { creditScore: Math.round(score * 10) / 10, creditLimit },
    })
  },

  async applyForLoan(userId: string, amount: number) {
    const shop = await prisma.shop.findUnique({
      where: { userId },
      include: { loans: { where: { status: 'ACTIVE' } } },
    })
    if (!shop) throw new NotFoundError('Shop')
    if (shop.creditScore < 50) throw new AppError('Credit score too low for a loan', 400)
    if (amount > shop.creditLimit) throw new AppError(`Amount exceeds your credit limit of ${shop.creditLimit} ETB`, 400)
    if (shop.loans.length > 0) throw new AppError('You have an active loan. Repay it first.', 400)

    const fee = Math.round(amount * LOAN_FEE_RATE)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    return prisma.loan.create({
      data: { shopId: shop.id, amount, fee, dueDate },
    })
  },

  async repayLoan(userId: string, loanId: string) {
    const shop = await prisma.shop.findUnique({ where: { userId } })
    if (!shop) throw new NotFoundError('Shop')

    const loan = await prisma.loan.findFirst({
      where: { id: loanId, shopId: shop.id, status: 'ACTIVE' },
    })
    if (!loan) throw new NotFoundError('Active loan')

    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: { status: 'REPAID', repaidAt: new Date() },
    })

    // Recalculate credit score after repayment
    await this.recalculate(shop.id)

    return updated
  },
}
