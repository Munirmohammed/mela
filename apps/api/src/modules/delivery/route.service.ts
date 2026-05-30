import axios from 'axios'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'
import { GeoPoint, MERKATO, nearestNeighborOrder } from '../../utils/geo'

export interface StopInput {
  orderId: string
  shopId: string
  lat: number | null
  lng: number | null
}

export interface OptimizedStop extends StopInput {
  sequence: number
}

export interface OptimizedRoute {
  origin: GeoPoint
  stops: OptimizedStop[]
  polyline?: string
  provider: string
}

export interface RouteOptimizer {
  readonly name: string
  optimize(origin: GeoPoint, stops: StopInput[]): Promise<OptimizedRoute>
}

function hasCoords(s: StopInput): s is StopInput & { lat: number; lng: number } {
  return typeof s.lat === 'number' && typeof s.lng === 'number'
}

/** Greedy nearest-neighbor optimizer — no external dependency. */
class LocalOptimizer implements RouteOptimizer {
  readonly name = 'LOCAL_NN'
  async optimize(origin: GeoPoint, stops: StopInput[]): Promise<OptimizedRoute> {
    const withCoords = stops.filter(hasCoords)
    const withoutCoords = stops.filter((s) => !hasCoords(s))
    const ordered = nearestNeighborOrder(
      origin,
      withCoords.map((s) => ({ ...s, lat: s.lat, lng: s.lng }))
    )
    const all = [...ordered, ...withoutCoords]
    return {
      origin,
      provider: this.name,
      stops: all.map((s, i) => ({ ...s, sequence: i + 1 })),
    }
  }
}

/** Google Directions with waypoint optimization. */
class GoogleOptimizer implements RouteOptimizer {
  readonly name = 'GOOGLE'
  constructor(private readonly apiKey: string) {}

  async optimize(origin: GeoPoint, stops: StopInput[]): Promise<OptimizedRoute> {
    const located = stops.filter(hasCoords)
    if (located.length < 2) return new LocalOptimizer().optimize(origin, stops)

    try {
      const waypoints = located.map((s) => `${s.lat},${s.lng}`).join('|')
      const { data } = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${located[located.length - 1].lat},${located[located.length - 1].lng}`,
          waypoints: `optimize:true|${waypoints}`,
          key: this.apiKey,
        },
      })
      const order: number[] | undefined = data?.routes?.[0]?.waypoint_order
      const polyline: string | undefined = data?.routes?.[0]?.overview_polyline?.points
      if (!order) return new LocalOptimizer().optimize(origin, stops)

      const orderedLocated = order.map((idx) => located[idx])
      const withoutCoords = stops.filter((s) => !hasCoords(s))
      const all = [...orderedLocated, ...withoutCoords]
      return {
        origin,
        provider: this.name,
        polyline,
        stops: all.map((s, i) => ({ ...s, sequence: i + 1 })),
      }
    } catch (err: any) {
      logger.warn('Google route optimization failed, falling back to local', {
        err: err?.message,
      })
      return new LocalOptimizer().optimize(origin, stops)
    }
  }
}

export const routeOptimizer: RouteOptimizer = env.GOOGLE_MAPS_API_KEY
  ? new GoogleOptimizer(env.GOOGLE_MAPS_API_KEY)
  : new LocalOptimizer()

export { MERKATO }
