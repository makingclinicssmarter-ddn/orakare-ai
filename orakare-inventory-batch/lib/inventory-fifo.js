/**
 * FIFO batch dispensing for inventory items.
 *
 * Strategy: oldest expiry first, ignoring expired and non-active batches.
 * If no batches have expiry, oldest receivedDate wins.
 *
 * Returns: { allocations: [{ batchId, qty, unitCost }], shortBy: number }
 * - allocations: which batches to draw from and how much
 * - shortBy: if the requested qty exceeded available stock, how much was missing
 *
 * Caller is responsible for actually decrementing the batches inside a
 * transaction. This function only computes the plan.
 */

export function planFifoDispense(batches, requestedQty) {
  const want = Number(requestedQty)
  if (!Number.isFinite(want) || want <= 0) {
    return { allocations: [], shortBy: 0 }
  }

  const now = new Date()

  // Eligible: ACTIVE status, qty > 0, not past expiry
  const eligible = (batches || []).filter(function(b) {
    if (b.status !== 'ACTIVE') return false
    if ((b.quantity || 0) <= 0) return false
    if (b.expiryDate) {
      const expiry = new Date(b.expiryDate)
      if (expiry < now) return false
    }
    return true
  })

  // Sort: items with expiry come first (sorted by earliest expiry).
  // Items without expiry come after, sorted by earliest receivedDate.
  eligible.sort(function(a, b) {
    if (a.expiryDate && b.expiryDate) {
      return new Date(a.expiryDate) - new Date(b.expiryDate)
    }
    if (a.expiryDate && !b.expiryDate) return -1
    if (!a.expiryDate && b.expiryDate) return 1
    return new Date(a.receivedDate) - new Date(b.receivedDate)
  })

  const allocations = []
  let remaining = want
  for (const b of eligible) {
    if (remaining <= 0) break
    const take = Math.min(remaining, b.quantity)
    allocations.push({ batchId: b.id, qty: take, unitCost: b.unitCost })
    remaining -= take
  }

  return { allocations, shortBy: Math.max(0, remaining) }
}

/**
 * Compute aggregated stock for an item from its batches.
 * Returns { totalActive, totalAtRisk (expiring soon), expiredQty, oldestExpiry, batchCount }
 */
export function summarizeBatches(batches) {
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  let totalActive = 0
  let totalAtRisk = 0
  let expiredQty = 0
  let oldestExpiry = null

  ;(batches || []).forEach(function(b) {
    if (b.status === 'DEPLETED' || b.status === 'DAMAGED') return
    if (b.status === 'EXPIRED') {
      expiredQty += (b.quantity || 0)
      return
    }

    if (b.expiryDate) {
      const exp = new Date(b.expiryDate)
      if (exp < now) {
        expiredQty += (b.quantity || 0)
        return
      }
      if (exp < thirtyDays) {
        totalAtRisk += (b.quantity || 0)
      }
      if (!oldestExpiry || exp < oldestExpiry) {
        oldestExpiry = exp
      }
    }

    totalActive += (b.quantity || 0)
  })

  return {
    totalActive,
    totalAtRisk,
    expiredQty,
    oldestExpiry: oldestExpiry ? oldestExpiry.toISOString() : null,
    batchCount: (batches || []).filter(function(b) { return b.status === 'ACTIVE' && (b.quantity || 0) > 0 }).length,
  }
}
