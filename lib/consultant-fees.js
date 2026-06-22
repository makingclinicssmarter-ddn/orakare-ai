/**
 * Consultant fee accrual helpers.
 *
 * Model: collect-first (option b). When a patient pays an amount toward
 * a treatment that has a consultant attached, a FeeEntry row is created
 * representing the consultant's proportional share of THAT payment.
 *
 * For FIXED splits, the entry's share scales linearly with payment %
 * relative to the treatment estimate. E.g. consultant flat fee ₹2000 on
 * a ₹5000 estimate: when ₹2500 is collected (50% of estimate), consultant
 * accrues ₹1000 (50% of fee).
 *
 * For PERCENTAGE splits, the entry's share is directly the % of the
 * payment. E.g. 40% split, ₹1000 collected → consultant accrues ₹400.
 *
 * Materials & medicines are NOT deducted from consultant share — they're
 * clinic's expense (per Push #9 business rule).
 */

/**
 * Compute the consultant's share for a single payment event.
 *
 * @param {Object} treatment - { estimate, discount, splitType, splitValue }
 * @param {number} paymentAmount - the amount being collected NOW
 * @returns {number} the consultant's share of this payment (₹0 if no consultant or invalid)
 */
export function computeFeeForPayment(treatment, paymentAmount) {
  if (!treatment) return 0
  if (!treatment.consultantId) return 0
  const amt = Number(paymentAmount) || 0
  if (amt <= 0) return 0

  const splitType = treatment.splitType
  const splitValue = Number(treatment.splitValue) || 0
  if (!splitType || splitValue <= 0) return 0

  if (splitType === 'PERCENTAGE') {
    // Direct % of payment
    return amt * (splitValue / 100)
  }

  if (splitType === 'FIXED') {
    // Scale flat fee proportionally to payment vs net estimate.
    // Net estimate = estimate − discount.
    const netEstimate = Math.max(0, Number(treatment.estimate || 0) - Number(treatment.discount || 0))
    if (netEstimate <= 0) return 0
    const proportion = amt / netEstimate
    return splitValue * proportion
  }

  return 0
}

/**
 * Build the FeeEntry data row to create for a payment event.
 * Returns null if no fee is owed (no consultant, no split, etc).
 */
export function buildFeeEntryRecord({ clinicId, treatment, paymentAmount, invoiceId }) {
  const share = computeFeeForPayment(treatment, paymentAmount)
  if (share <= 0) return null
  return {
    clinicId,
    consultantId: treatment.consultantId,
    treatmentId: treatment.id,
    invoiceId: invoiceId || null,
    totalCollected: Number(paymentAmount),
    clinicShare: Number(paymentAmount) - share,
    consultantShare: share,
    splitType: treatment.splitType,
    splitValue: treatment.splitValue,
    status: 'PENDING',
  }
}
