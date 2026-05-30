import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
    ],
  })

// `as never` works around Prisma not always propagating log-event literals into
// the `$on` overload generic; the handler stays typed as a LogEvent.
prisma.$on('error' as never, (e: Prisma.LogEvent) =>
  logger.error('Prisma error', { message: e.message })
)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
