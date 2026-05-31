import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../src/lib/api'
import { getSocket } from '../../../src/lib/socket'
import { colors, radius, spacing } from '../../../src/theme'

export default function Track() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [live, setLive] = useState<{ lat: number; lng: number } | null>(null)

  const { data } = useQuery({
    queryKey: ['tracking', id],
    queryFn: () => api.delivery.track(String(id)),
    refetchInterval: 20000,
  })

  useEffect(() => {
    const s = getSocket()
    s.emit('join-order', String(id))
    const onLoc = (loc: { lat: number; lng: number }) => setLive({ lat: loc.lat, lng: loc.lng })
    s.on('location-update', onLoc)
    return () => {
      s.off('location-update', onLoc)
    }
  }, [id])

  useEffect(() => {
    if (data?.batchId) getSocket().emit('join-batch', data.batchId)
  }, [data?.batchId])

  const driver =
    live ?? (data?.driverLocation ? { lat: data.driverLocation.lat, lng: data.driverLocation.lng } : null)
  const shop =
    data?.stop?.lat != null && data?.stop?.lng != null
      ? { lat: data.stop.lat, lng: data.stop.lng }
      : null
  const center = driver ?? shop

  return (
    <View style={styles.root}>
      {center ? (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {driver ? (
            <Marker
              coordinate={{ latitude: driver.lat, longitude: driver.lng }}
              title={data?.driver?.name ?? 'Driver'}
              description={data?.driver?.plateNo}
              pinColor={colors.brand}
            />
          ) : null}
          {shop ? (
            <Marker coordinate={{ latitude: shop.lat, longitude: shop.lng }} title="Your shop" />
          ) : null}
        </MapView>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.dim}>Waiting for the driver to start the route…</Text>
        </View>
      )}

      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <View style={styles.banner}>
        <Text style={styles.bannerStatus}>{data?.batchStatus ?? data?.orderStatus ?? 'Tracking'}</Text>
        {data?.driver ? (
          <Text style={styles.bannerLine}>
            {data.driver.name} · {data.driver.vehicle} ({data.driver.plateNo})
          </Text>
        ) : null}
        <Text style={styles.bannerEta}>
          {data?.etaMinutes != null ? `~${data.etaMinutes} min away` : 'ETA updating…'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dim: { color: colors.textDim, textAlign: 'center' },
  back: {
    position: 'absolute',
    top: 48,
    left: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backText: { color: colors.brand, fontSize: 15, fontWeight: '600' },
  banner: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  bannerStatus: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  bannerLine: { color: colors.text, fontSize: 14 },
  bannerEta: { color: colors.textDim, fontSize: 13 },
})
