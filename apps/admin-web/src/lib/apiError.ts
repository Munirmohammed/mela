/** Extract a human-readable message from an axios error response */
export function getErrorMessage(err: any, fallback = 'Something went wrong'): string {
  const data = err?.response?.data
  if (!data) return fallback
  if (data.message) return data.message
  return fallback
}

/** Extract field-level validation errors from a 400 Zod response */
export function getFieldErrors(err: any): Record<string, string> {
  const errors: { field: string; message: string }[] = err?.response?.data?.errors ?? []
  return errors.reduce((acc, e) => ({ ...acc, [e.field]: e.message }), {})
}
