/**
 * Per-patient financial computation — Push #3.5 version with proper
 * kind-based invoice filtering.
 *
 * Used identically by:
 *   - Records page (/dashboard/patients/[id])
 *   - Balance page (/dashboard/balance)
 *   - Main dashboard's "Balance pending" total
 *   - Treatments tab balance figures
 *
 * Two independent revenue streams:
 *
 *   Treatments stream
 *     - estimate  = sum of Treatment.estimate − Treatment.discount
 *     - collected = sum of Receipt.amount where allocations.length > 0
 *                   (i.e. payments tagged to a specific Treatment via
 *                   PaymentAllocation)
 *     - balance   = max(0, estimate − collected)
 *
 *   Visit-charges stream — ONLY invoices with kind='VISIT_CHARGES'
 *     - invoiced  = sum of Invoice.total where kind === 'VISIT_CHARGES'
 *     - collected = sum of Receipt.amount where allocations.length === 0
 *                   AND the receipt is linked to a VISIT_CHARGES invoice
 *                   (or has no invoiceId — orphan, treated as visit-charge)
 *     - balance   = sum of (Invoice.balance) for VISIT_CHARGES invoices
 *
 * Unallocated payments — receipts with allocations.length === 0 AND no
 * invoiceId AND amount > 0. These represent advances or unparked payments
 * Dr. Shobhna hasn't yet decided how to allocate. Shown separately.
 *
 * Input shape required:
 *   patient.treatments: [{ estimate, discount, ... }]
 *   patient.receipts:   [{ amount, invoiceId, allocations: [...] }]
 *   patient.invoices:   [{ total, balance, kind, ... }]
 *
 * IMPORTANT: callers must include `kind` in their Invoice select/include.
 */

export function computePatientFinances(patient) {
  const treatments = patient.treatments || []
  const receipts = patient.receipts || []
  const invoices = patient.invoices || []

  // --- Treatments stream -----------------------------------------------------
  const treatmentEstimate = treatments.reduce(function(s, t) {
    return s + (Number(t.estimate) || 0) - (Number(t.discount) || 0)
  }, 0)

  // Build a Set of invoice IDs that are VISIT_CHARGES, for receipt classification.
  const visitChargeInvoiceIds = new Set(
    invoices.filter(function(i) { return i.kind === 'VISIT_CHARGES' }).map(function(i) { return i.id })
  )

  let treatmentCollected = 0
  let visitChargesCollected = 0
  let unallocatedAdvances = 0

  receipts.forEach(function(r) {
    const hasAllocations = Array.isArray(r.allocations) && r.allocations.length > 0
    const amt = Number(r.amount) || 0
    if (hasAllocations) {
      // Tagged to a treatment via PaymentAllocation → counts toward treatment collected.
      treatmentCollected += amt
    } else if (r.invoiceId && visitChargeInvoiceIds.has(r.invoiceId)) {
      // Linked to a VISIT_CHARGES invoice → visit-charge payment.
      visitChargesCollected += amt
    } else if (r.invoiceId) {
      // Linked to an invoice we don't have included or that's TREATMENT kind
      // — defensively count it as visit-charge to avoid double-counting.
      // (In practice this branch should not fire if invoices are fully loaded.)
      visitChargesCollected += amt
    } else {
      // Receipt with no invoiceId AND no allocations → unallocated/advance.
      unallocatedAdvances += amt
    }
  })

  const treatmentBalance = Math.max(0, treatmentEstimate - treatmentCollected)
  const treatmentCredit  = Math.max(0, treatmentCollected - treatmentEstimate)

  // --- Visit-charges stream --------------------------------------------------
  const visitChargesInvoiced = invoices.reduce(function(s, inv) {
    if (inv.kind !== 'VISIT_CHARGES') return s
    return s + (Number(inv.total) || 0)
  }, 0)
  const visitChargesBalance = invoices.reduce(function(s, inv) {
    if (inv.kind !== 'VISIT_CHARGES') return s
    return s + Math.max(0, Number(inv.balance) || 0)
  }, 0)

  return {
    treatment: {
      estimate: treatmentEstimate,
      collected: treatmentCollected,
      balance: treatmentBalance,
      credit: treatmentCredit,
    },
    visitCharges: {
      invoiced: visitChargesInvoiced,
      collected: visitChargesCollected,
      balance: visitChargesBalance,
    },
    unallocated: unallocatedAdvances,
    // Total outstanding (the number the dashboard card displays).
    totalBalance: treatmentBalance + visitChargesBalance,
  }
}
