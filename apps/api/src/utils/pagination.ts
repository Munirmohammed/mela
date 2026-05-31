export interface PageParams {
  page: number
  pageSize: number
  skip: number
  take: number
}

/**
 * Parse `page`/`pageSize` query params into safe Prisma skip/take values.
 * Guards against unbounded queries by clamping pageSize to `max`.
 */
export function parsePage(
  query: { page?: unknown; pageSize?: unknown },
  opts: { pageSize?: number; max?: number } = {}
): PageParams {
  const defaultSize = opts.pageSize ?? 20
  const max = opts.max ?? 100
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(max, Math.max(1, Number(query.pageSize) || defaultSize))
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}
