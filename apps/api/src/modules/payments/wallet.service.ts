import { Prisma } from '@prisma/client'
import { prisma } from '../../prisma/client'
import { AppError, NotFoundError } from '../../utils/AppError'
import { writeAudit } from '../../utils/audit'

type Tx = Prisma.TransactionClient

interface LedgerRef {
  reason: string
  refType?: string
  refId?: string
  meta?: Record<string, unknown>
}

/** Round to 2 decimals to avoid floating-point drift in money math. */
function money(n: number): number {
  return Math.round(n * 100) / 100
}

async function getOrCreateWallet(tx: Tx, shopId: string) {
  const existing = await tx.wallet.findUnique({ where: { shopId } })
  if (existing) return existing
  return tx.wallet.create({ data: { shopId } })
}

export const walletService = {
  async getBalance(shopId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { shopId } })
    return { balance: wallet?.balance ?? 0, currency: wallet?.currency ?? 'ETB' }
  },

  async getTransactions(shopId: string, limit = 50) {
    const wallet = await prisma.wallet.findUnique({ where: { shopId } })
    if (!wallet) return []
    return prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    })
  },

  /** Add funds. Safe to call inside a caller-supplied transaction. */
  async credit(shopId: string, amount: number, ref: LedgerRef, tx?: Tx) {
    if (amount <= 0) throw new AppError('Credit amount must be positive', 400)
    const run = async (t: Tx) => {
      const wallet = await getOrCreateWallet(t, shopId)
      const balanceAfter = money(wallet.balance + amount)
      await t.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } })
      await t.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          amount: money(amount),
          balanceAfter,
          reason: ref.reason,
          refType: ref.refType,
          refId: ref.refId,
          meta: (ref.meta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      })
      await writeAudit(t, {
        actor: 'system',
        action: 'WALLET_CREDITED',
        entity: 'Wallet',
        entityId: wallet.id,
        meta: { amount, balanceAfter, ...ref },
      })
      return balanceAfter
    }
    return tx ? run(tx) : prisma.$transaction(run)
  },

  /** Remove funds. Rejects if it would overdraw the wallet. */
  async debit(shopId: string, amount: number, ref: LedgerRef, tx?: Tx) {
    if (amount <= 0) throw new AppError('Debit amount must be positive', 400)
    const run = async (t: Tx) => {
      const wallet = await getOrCreateWallet(t, shopId)
      if (wallet.balance + 1e-9 < amount) {
        throw new AppError('Insufficient wallet balance', 400)
      }
      const balanceAfter = money(wallet.balance - amount)
      await t.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } })
      await t.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: money(amount),
          balanceAfter,
          reason: ref.reason,
          refType: ref.refType,
          refId: ref.refId,
          meta: (ref.meta ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        },
      })
      await writeAudit(t, {
        actor: 'system',
        action: 'WALLET_DEBITED',
        entity: 'Wallet',
        entityId: wallet.id,
        meta: { amount, balanceAfter, ...ref },
      })
      return balanceAfter
    }
    return tx ? run(tx) : prisma.$transaction(run)
  },

  /** Sum of the ledger — the source of truth used to assert balance integrity. */
  async ledgerTotal(shopId: string): Promise<number> {
    const wallet = await prisma.wallet.findUnique({ where: { shopId } })
    if (!wallet) return 0
    const txns = await prisma.walletTransaction.findMany({ where: { walletId: wallet.id } })
    const total = txns.reduce((acc, t) => acc + (t.type === 'CREDIT' ? t.amount : -t.amount), 0)
    return money(total)
  },

  async requireWallet(shopId: string) {
    const wallet = await prisma.wallet.findUnique({ where: { shopId } })
    if (!wallet) throw new NotFoundError('Wallet')
    return wallet
  },
}
