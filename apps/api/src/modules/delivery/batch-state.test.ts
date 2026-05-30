import { describe, it, expect } from 'vitest'
import { canTransition, assertTransition } from './batch-state'

describe('batch state machine', () => {
  it('allows the forward lifecycle', () => {
    expect(canTransition('AGGREGATING', 'PURCHASING')).toBe(true)
    expect(canTransition('PURCHASING', 'IN_TRANSIT')).toBe(true)
    expect(canTransition('IN_TRANSIT', 'DELIVERED')).toBe(true)
  })

  it('rejects skips and reversals', () => {
    expect(canTransition('AGGREGATING', 'IN_TRANSIT')).toBe(false)
    expect(canTransition('AGGREGATING', 'DELIVERED')).toBe(false)
    expect(canTransition('DELIVERED', 'IN_TRANSIT')).toBe(false)
    expect(canTransition('IN_TRANSIT', 'PURCHASING')).toBe(false)
  })

  it('assertTransition throws on an illegal transition', () => {
    expect(() => assertTransition('AGGREGATING', 'DELIVERED')).toThrow(/Illegal batch transition/)
    expect(() => assertTransition('PURCHASING', 'IN_TRANSIT')).not.toThrow()
  })
})
