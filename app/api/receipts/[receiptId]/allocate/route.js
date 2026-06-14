import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/receipts/[receiptId]/allocate
// Body: { allocations: [{ treatmentId, amount }] }
//
// Used by the "Apply unallocated" UI on the Records page. Creates
// PaymentAllocation rows linking an existing receipt to one or more
// treatments. The receipt must currently have NO allocations (i.e. it
// was parked as unallocated when first recorded).
//
// Sum of allocated amounts must equal the receipt amount.

export async function POST(req, props) {
  const params = await props.params
  const receiptId = params.receiptId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const incoming = Array.isArray(body.allocations) ? body.allocations : []

  // Find the receipt + verify it's an unallocated one in this clinic
  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, clinicId: ctx.clinicId },
    include: { allocations: { select: { id: true } } },
  })
  if (!receipt) return notFoundResponse()
  if (receipt.allocations.length > 0) {
    return NextResponse.json({ error: 'Receipt already has allocations' }, { status: 400 })
  }
  if (receipt.invoiceId) {
    return NextResponse.json({ error: 'Receipt is linked to an invoice (visit-charges payment); cannot allocate to treatments' }, { status: 400 })
  }

  const cleaned = incoming
    .filter(function(a) { return a && a.treatmentId && Number(a.amount) > 0 })
    .map(function(a) { return { treatmentId: String(a.treatmentId), amount: Number(a.amount) } })

  if (cleaned.length === 0) {
    return NextResponse.json({ error: 'No valid allocations' }, { status: 400 })
  }

  const allocTotal = cleaned.reduce(function(s, a) { return s + a.amount }, 0)
  if (Math.abs(allocTotal - Number(receipt.amount)) > 0.5) {
    return NextResponse.json({
      error: 'Allocation total (' + allocTotal + ') must equal receipt amount (' + receipt.amount + ')'
    }, { status: 400 })
  }

  // Verify all treatments exist + belong to the receipt's patient
  const treatments = await db.treatment.findMany({
    where: { id: { in: cleaned.map(function(a) { return a.treatmentId }) }, clinicId: ctx.clinicId, patientId: receipt.patientId },
    select: { id: true },
  })
  if (treatments.length !== new Set(cleaned.map(function(a) { return a.treatmentId })).size) {
    return NextResponse.json({ error: 'One or more treatments not found or belong to different patient' }, { status: 400 })
  }

  // Create the allocations
  await db.$transaction(cleaned.map(function(a) {
    return db.paymentAllocation.create({
      data: { receiptId: receiptId, treatmentId: a.treatmentId, amount: a.amount },
    })
  }))

  return NextResponse.json({ ok: true, allocated: cleaned.length })
}
