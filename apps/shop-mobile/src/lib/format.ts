/** Format an amount as ETB with thousands separators (Hermes-safe, no Intl). */
export function formatETB(n: number): string {
  const grouped = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${grouped} ETB`
}
