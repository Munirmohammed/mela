import { describe, it, expect } from 'vitest'
import { haversineKm, nearestNeighborOrder, etaMinutes, MERKATO } from './geo'

describe('geo', () => {
  it('haversine is ~0 for the same point', () => {
    expect(haversineKm(MERKATO, MERKATO)).toBeLessThan(0.001)
  })

  it('haversine matches a known short distance (~1.6km across Addis)', () => {
    const d = haversineKm({ lat: 9.01, lng: 38.74 }, { lat: 9.02, lng: 38.75 })
    expect(d).toBeGreaterThan(1)
    expect(d).toBeLessThan(2.5)
  })

  it('nearest-neighbor visits the closest point first', () => {
    const origin = { lat: 0, lng: 0 }
    const points = [
      { id: 'far', lat: 0, lng: 5 },
      { id: 'near', lat: 0, lng: 1 },
      { id: 'mid', lat: 0, lng: 3 },
    ]
    const ordered = nearestNeighborOrder(origin, points)
    expect(ordered.map((p) => p.id)).toEqual(['near', 'mid', 'far'])
  })

  it('eta is at least 1 minute and grows with distance', () => {
    const a = etaMinutes({ lat: 0, lng: 0 }, { lat: 0, lng: 0.1 })
    const b = etaMinutes({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(a).toBeGreaterThanOrEqual(1)
    expect(b).toBeGreaterThan(a)
  })
})
