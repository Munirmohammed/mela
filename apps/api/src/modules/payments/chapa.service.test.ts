import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { ChapaProvider } from './chapa.service'

const WEBHOOK_SECRET = 'whsec_test_123'
const provider = new ChapaProvider('sk_test', WEBHOOK_SECRET, 'https://api.chapa.co/v1')

function sign(body: Buffer): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
}

describe('ChapaProvider.verifyWebhookSignature', () => {
  const body = Buffer.from(JSON.stringify({ tx_ref: 'pay_abc', status: 'success' }))

  it('accepts a correctly signed payload', () => {
    expect(provider.verifyWebhookSignature(body, sign(body))).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const tampered = Buffer.from(JSON.stringify({ tx_ref: 'pay_abc', status: 'failed' }))
    expect(provider.verifyWebhookSignature(tampered, sign(body))).toBe(false)
  })

  it('rejects a wrong-secret signature', () => {
    const wrong = crypto.createHmac('sha256', 'other').update(body).digest('hex')
    expect(provider.verifyWebhookSignature(body, wrong)).toBe(false)
  })

  it('rejects a missing signature', () => {
    expect(provider.verifyWebhookSignature(body, undefined)).toBe(false)
  })
})
