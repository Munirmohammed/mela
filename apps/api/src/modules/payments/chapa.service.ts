import crypto from 'crypto'
import axios from 'axios'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

export interface InitInput {
  txRef: string
  amount: number
  currency?: string
  email?: string
  phone?: string
  firstName?: string
  callbackUrl?: string
  returnUrl?: string
}

export interface InitResult {
  checkoutUrl: string | null
  raw?: unknown
}

export interface VerifyResult {
  status: 'success' | 'pending' | 'failed'
  amount?: number
  raw?: unknown
}

/** Abstraction over a payment gateway so the provider can be swapped or stubbed. */
export interface PaymentProvider {
  readonly name: string
  initialize(input: InitInput): Promise<InitResult>
  verify(txRef: string): Promise<VerifyResult>
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean
}

/** Real Chapa gateway (https://developer.chapa.co). */
export class ChapaProvider implements PaymentProvider {
  readonly name = 'CHAPA'
  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string,
    private readonly baseUrl: string
  ) {}

  async initialize(input: InitInput): Promise<InitResult> {
    const { data } = await axios.post(
      `${this.baseUrl}/transaction/initialize`,
      {
        amount: input.amount,
        currency: input.currency ?? 'ETB',
        tx_ref: input.txRef,
        email: input.email,
        phone_number: input.phone,
        first_name: input.firstName,
        callback_url: input.callbackUrl,
        return_url: input.returnUrl,
      },
      { headers: { Authorization: `Bearer ${this.secretKey}` } }
    )
    return { checkoutUrl: data?.data?.checkout_url ?? null, raw: data }
  }

  async verify(txRef: string): Promise<VerifyResult> {
    const { data } = await axios.get(`${this.baseUrl}/transaction/verify/${txRef}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    })
    const status = data?.data?.status === 'success' ? 'success' : 'pending'
    return { status, amount: data?.data?.amount, raw: data }
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature) return false
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex')
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    } catch {
      return false
    }
  }
}

/**
 * Dev/test stub used when CHAPA_SECRET_KEY is unset. Returns a fake checkout URL,
 * treats verification as successful, and (for safety) accepts any signature ONLY
 * in non-production so webhook flows can be exercised locally.
 */
class StubProvider implements PaymentProvider {
  readonly name = 'CHAPA_STUB'
  async initialize(input: InitInput): Promise<InitResult> {
    logger.warn('Chapa stub provider in use — no real payment will occur', { txRef: input.txRef })
    return { checkoutUrl: `https://pay.local/stub/${input.txRef}` }
  }
  async verify(): Promise<VerifyResult> {
    return { status: 'success' }
  }
  verifyWebhookSignature(): boolean {
    return env.NODE_ENV !== 'production'
  }
}

export const paymentProvider: PaymentProvider = env.CHAPA_SECRET_KEY
  ? new ChapaProvider(
      env.CHAPA_SECRET_KEY,
      env.CHAPA_WEBHOOK_SECRET ?? env.CHAPA_SECRET_KEY,
      env.CHAPA_BASE_URL
    )
  : new StubProvider()
