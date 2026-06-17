import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/treatments/[treatmentId]/record-payment
// Body: { amount, mode, note?, date? }
//
// Records a payment against a specific treatment. Creates:
//   1. A Receipt row
//   2. A PaymentAllocation row linking the Receipt to this Treatment
//
// Works for treatments in ANY status — including COMPLETED. The completion
// stamp doesn't lock financials.
//
// Validation:
//   - amount > 0
//   - amount <= current treatment balance (no overpayment via this path —
//     keeps the math clean; if she truly needs to record more than the
//     estimate, she should edit the estimate first)

export async function POST(req, props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const amount = Number(body.amount)
  const mode = typeof body.mode === 'string' && body.mode ? body.mode : 'Cash'
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const dateStr = typeof body.date === 'string' && body.date ? body.date : null

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
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
      paymentAllocations: { select: { amount: true } },
    },
  })
  if (!treatment) return notFoundResponse()

  // Compute current balance: estimate − discount − sum(allocations).
  // Same formula used by computePatientFinances on the Records page.
  const netEstimate = Math.max(0, Number(treatment.estimate || 0) - Number(treatment.discount || 0))
  const alreadyPaid = (treatment.paymentAllocations || []).reduce(function(s, a) {
    return s + Number(a.amount || 0)
  }, 0)
  const currentBalance = Math.max(0, netEstimate - alreadyPaid)

  if (currentBalance <= 0) {
    return NextResponse.json({
      error: 'No outstanding balance on this treatment. Nothing to record.',
    }, { status: 400 })
  }
  if (amount > currentBalance + 0.5) {
    return NextResponse.json({
      error: 'Amount ₹' + amount + ' exceeds outstanding balance ₹' + currentBalance.toFixed(0)
           + '. Record only what was actually received, or edit the treatment estimate first.',
    }, { status: 400 })
  }

  const receiptDate = dateStr
    ? new Date(dateStr + 'T00:00:00+05:30')
    : new Date()

  const treatmentLabel = (treatment.type || 'Treatment') + (treatment.area ? ' ' + treatment.area : '')

  try {
    const result = await db.$transaction(async function(tx) {
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

      return { receiptId: receipt.id, newBalance: Math.max(0, currentBalance - amount) }
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
