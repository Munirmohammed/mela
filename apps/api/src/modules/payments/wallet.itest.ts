import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { HAS_DB, prisma, resetDb, makeShop } from '../../test/integration'
import { walletService } from './wallet.service'

describe.skipIf(!HAS_DB)('wallet ledger (integration)', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })
  beforeEach(async () => {
    await resetDb()
  })

  it('credits and debits keep balance == sum(ledger)', async () => {
    const { shop } = await makeShop()
    await walletService.credit(shop.id, 100, { reason: 'top-up' })
    await walletService.debit(shop.id, 30, { reason: 'order' })

    const { balance } = await walletService.getBalance(shop.id)
    const ledger = await walletService.ledgerTotal(shop.id)
    expect(balance).toBe(70)
    expect(ledger).toBe(70)
  })

  it('rejects an overdraw and leaves the balance untouched', async () => {
    const { shop } = await makeShop()
    await walletService.credit(shop.id, 50, { reason: 'top-up' })
    await expect(walletService.debit(shop.id, 80, { reason: 'order' })).rejects.toThrow(
      /Insufficient wallet balance/
    )
    const { balance } = await walletService.getBalance(shop.id)
    expect(balance).toBe(50)
  })

  it('writes a ledger row per movement', async () => {
    const { shop } = await makeShop()
    await walletService.credit(shop.id, 10, { reason: 'a' })
    await walletService.credit(shop.id, 20, { reason: 'b' })
    const txns = await walletService.getTransactions(shop.id)
    expect(txns).toHaveLength(2)
  })
})
