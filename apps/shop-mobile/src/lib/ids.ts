/** Generate a client idempotency key (Hermes-safe; no crypto.randomUUID needed). */
export function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
