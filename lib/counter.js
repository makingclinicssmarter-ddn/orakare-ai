import { db } from '@/lib/db'

/**
 * Atomically generate the next sequence number for a clinic + kind.
 *
 * Prisma's upsert with a numeric `increment` compiles to a single
 * INSERT ... ON CONFLICT ... DO UPDATE SET lastValue = lastValue + 1
 * statement, which acquires a row lock under PostgreSQL's MVCC and is
 * therefore safe under arbitrary concurrency.
 *
 * @param {string} clinicId
 * @param {'PATIENT' | 'INVOICE'} kind
 * @returns {Promise<number>} the next value (1-based)
 */
export async function nextCounter(clinicId, kind) {
  if (!clinicId) throw new Error('nextCounter: clinicId required')
  if (!kind) throw new Error('nextCounter: kind required')

  const counter = await db.clinicCounter.upsert({
    where: { clinicId_kind: { clinicId, kind } },
    update: { lastValue: { increment: 1 } },
    create: { clinicId, kind, lastValue: 1 },
  })
  return counter.lastValue
}

export function formatPatientId(n) {
  return 'ORK-' + String(n).padStart(3, '0')
}

/**
 * Year-prefixed invoice number to match existing OKR-2026-XXXX pattern.
 * Year is computed at call time so this rolls over automatically each
 * financial year. The optional `prefix` arg lets clinics with a custom
 * invoicePrefix on the Clinic model override "OKR".
 */
export function formatInvoiceNo(prefix, n) {
  const year = new Date().getFullYear()
  return (prefix || 'OKR') + '-' + year + '-' + String(n).padStart(4, '0')
}
