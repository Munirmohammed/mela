export interface GeoPoint {
  lat: number
  lng: number
}

/** Merkato, Addis Ababa — the default route origin (where the truck buys). */
export const MERKATO: GeoPoint = { lat: 9.0107, lng: 38.736 }

const R_KM = 6371

/** Great-circle distance in kilometers between two points. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Greedy nearest-neighbor ordering from an origin. Deterministic and good
 * enough as a fallback when no external routing provider is configured.
 */
export function nearestNeighborOrder<T extends GeoPoint>(origin: GeoPoint, points: T[]): T[] {
  const remaining = [...points]
  const ordered: T[] = []
  let current: GeoPoint = origin
  while (remaining.length) {
    let bestIdx = 0
    let bestDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i])
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    const [next] = remaining.splice(bestIdx, 1)
    ordered.push(next)
    current = next
  }
  return ordered
}

/** Rough ETA in minutes for a straight-line distance at an assumed city speed. */
export function etaMinutes(from: GeoPoint, to: GeoPoint, kmPerHour = 25): number {
  const km = haversineKm(from, to)
  return Math.max(1, Math.round((km / kmPerHour) * 60))
}
