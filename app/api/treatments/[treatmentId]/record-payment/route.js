import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/treatments/[treatmentId]/record-payment
// Body: { amount, discount?, mode, note?, date? }
//
// Push #7: now accepts an optional `discount` field. The discount is ADDED
// to Treatment.discount (additive accumulation). The amount becomes a
// Receipt + PaymentAllocation as before.
//
// Either amount > 0 or discount > 0 (or both) must be provided.
// Combined (amount + discount) must not exceed current treatment balance.

export async function POST(req, props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const amount = Number(body.amount) || 0
  const discount = Number(body.discount) || 0
  const mode = typeof body.mode === 'string' && body.mode ? body.mode : 'Cash'
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const dateStr = typeof body.date === 'string' && body.date ? body.date : null

  if (amount <= 0 && discount <= 0) {
    return NextResponse.json({ error: 'Provide a payment amount, a discount, or both' }, { status: 400 })
  }
  if (amount < 0 || discount < 0) {
    return NextResponse.json({ error: 'Amount and discount cannot be negative' }, { status: 400 })
  }

  const treatment = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId },
    select: {
      id: true,
      patientId: true,
      estimate: true,
      discount: true,
      type: true,
      area: true,
      allocations: { select: { amount: true } },
    },
  })
  if (!treatment) return notFoundResponse()

  // Current balance = estimate − existing discount − sum(allocations)
  const netEstimate = Math.max(0, Number(treatment.estimate || 0) - Number(treatment.discount || 0))
  const alreadyPaid = (treatment.allocations || []).reduce(function(s, a) {
    return s + Number(a.amount || 0)
  }, 0)
  const currentBalance = Math.max(0, netEstimate - alreadyPaid)

  if (currentBalance <= 0) {
    return NextResponse.json({
      error: 'No outstanding balance on this treatment. Nothing to record.',
    }, { status: 400 })
  }
  if (amount + discount > currentBalance + 0.5) {
    return NextResponse.json({
      error: 'Amount + discount (₹' + (amount + discount).toFixed(0) + ') exceeds outstanding ₹' + currentBalance.toFixed(0)
           + '. Reduce the amount or discount, or edit the treatment estimate first.',
    }, { status: 400 })
  }

  const receiptDate = dateStr
    ? new Date(dateStr + 'T00:00:00+05:30')
    : new Date()

  const treatmentLabel = (treatment.type || 'Treatment') + (treatment.area ? ' ' + treatment.area : '')

  try {
    const result = await db.$transaction(async function(tx) {
      // Step 1: apply discount additively if any
      if (discount > 0) {
        await tx.treatment.update({
          where: { id: treatment.id },
          data: { discount: Number(treatment.discount || 0) + discount },
        })
      }

      // Step 2: create Receipt + PaymentAllocation if there's a payment
      let receiptId = null
      if (amount > 0) {
        const receipt = await tx.receipt.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: treatment.patientId,
            amount: amount,
            paymentMode: mode,
            notes: note
              ? 'Treatment payment — ' + treatmentLabel + ' — ' + note
              : 'Treatment payment — ' + treatmentLabel,
            date: receiptDate,
            invoiceId: null,
          },
        })

        await tx.paymentAllocation.create({
          data: {
            receiptId: receipt.id,
            treatmentId: treatment.id,
            amount: amount,
          },
        })
        receiptId = receipt.id
      }

      return { receiptId, newBalance: Math.max(0, currentBalance - amount - discount) }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Record treatment payment failed:', err)
    return NextResponse.json({
      error: 'Failed to record payment',
      detail: String(err.message || err),
    }, { status: 500 })
  }
}
