import { io, type Socket } from 'socket.io-client'

// The socket server lives at the API origin (without the /api/v1 prefix).
const origin = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/api\/v1\/?$/,
  ''
)

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(origin, { transports: ['websocket'], autoConnect: true })
  }
  return socket
}
