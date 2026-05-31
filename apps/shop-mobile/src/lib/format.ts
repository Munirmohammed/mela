/** Format an amount as ETB with thousands separators (Hermes-safe, no Intl). */
export function formatETB(n: number): string {
  const grouped = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${grouped} ETB`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Short date like "Jun 1" (Hermes-safe). */
export function formatDate(d: string | Date): string {
  const dt = new Date(d)
  return `${MONTHS[dt.getMonth()]} ${dt.getDate()}`
}

