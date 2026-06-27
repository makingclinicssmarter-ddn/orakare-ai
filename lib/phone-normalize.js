/**
 * Normalize a phone string to the last 10 digits for matching purposes.
 *
 * Patients may be stored with country codes (+91), without (), with hyphens,
 * spaces, etc. To reliably match a website-booked appointment phone against
 * an existing patient, we strip everything to digits and take the last 10.
 *
 * Examples:
 *   "+91 9058055134"  → "9058055134"
 *   "91-9058055134"   → "9058055134"
 *   "9058055134"      → "9058055134"
 *   "9058-055-134"    → "9058055134"
 *   "919058055134"    → "9058055134"
 *
 * Returns empty string if the input doesn't have 10 digits.
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return ''
  return digits.slice(-10)
}
