import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'
import { buildFeeEntryRecord } from '@/lib/consultant-fees'

// POST /api/consultants/[consultantId]/backfill
//
// When a consultant is attached to a treatment AFTER the patient has
// already paid, those past payments never generated FeeEntry rows. This
// endpoint walks all treatments where this consultant is currently attached,
// finds PaymentAllocations that don't have a matching FeeEntry yet, and
// creates the missing entries.
//
// We "match" by (treatmentId, totalCollected, createdAt approx) — there
// isn't a direct FK from PaymentAllocation to FeeEntry in the schema, so we
// reconstruct the relationship by comparing existing FeeEntries against
// PaymentAllocations on the same treatment.
//
// Strategy:
//   For each treatment with this consultant:
//     pastAllocations = sum of PaymentAllocation amounts on this treatment
//     existingFees    = sum of FeeEntry.totalCollected on this treatment
//     gap             = pastAllocations - existingFees (the unaccrued amount)
//     if gap > 0:
//       create ONE FeeEntry covering the gap (status=PENDING)
//
// This generates ONE backfill entry per treatment, not one per allocation —
// simpler audit, easier to settle later. The note field tags it as
// "Backfilled from existing payments" for transparency.

export async function POST(_req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const consultant = await db.consultant.findFirst({
    where: { id: params.consultantId, clinicId: ctx.clinicId },
    select: { id: true, name: true },
  })
  if (!consultant) return notFoundResponse()

  // Find all treatments where this consultant is currently attached
  const treatments = await db.treatment.findMany({
    where: { consultantId: consultant.id, clinicId: ctx.clinicId },
    select: {
      id: true,
      estimate: true,
      discount: true,
      consultantId: true,
      splitType: true,
      splitValue: true,
      allocations: { select: { amount: true } },
      feeEntries: { select: { totalCollected: true } },
    },
  })

  let created = 0
  let totalAccrued = 0
  const detail = []

  for (const t of treatments) {
    const pastPaid = (t.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
    const alreadyAccrued = (t.feeEntries || []).reduce(function(s, f) { return s + Number(f.totalCollected || 0) }, 0)
    const gap = pastPaid - alreadyAccrued

    if (gap <= 0.01) continue  // nothing to backfill

    const feeRecord = buildFeeEntryRecord({
      clinicId: ctx.clinicId,
      treatment: t,
      paymentAmount: gap,
      invoiceId: null,
    })
    if (!feeRecord) continue

    await db.feeEntry.create({
      data: {
        ...feeRecord,
        notes: 'Backfilled from existing payments (consultant attached after the fact)',
      },
    })

    created++
    totalAccrued += feeRecord.consultantShare
    detail.push({
      treatmentId: t.id,
      gap: gap,
      share: feeRecord.consultantShare,
    })
  }

  return NextResponse.json({
    ok: true,
    backfilledCount: created,
    totalAccrued: totalAccrued,
    detail,
  })
}
