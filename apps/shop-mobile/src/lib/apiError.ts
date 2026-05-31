/** Extract a human-readable message from an axios/API error without importing axios. */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { message?: string } }; message?: string }
    return e.response?.data?.message ?? e.message ?? 'Something went wrong'
  }
  return 'Something went wrong'
}
