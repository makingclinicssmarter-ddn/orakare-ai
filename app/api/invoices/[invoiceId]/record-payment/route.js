import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/invoices/[invoiceId]/record-payment
// Body: { amount, mode, note?, date? }
//
// Records a Receipt against an existing Invoice. Used when Dr. Shobhna
// forgot to enter payment at visit close, or when the patient pays later.
//
// The Receipt is dated today (or supplied date) — NOT backdated to the
// invoice's original date. That's intentional: this is when the payment
// was actually received/recorded, not when the invoice was generated.
//
// Updates Invoice.paid, Invoice.balance, Invoice.status accordingly.
// All in a single transaction.
//
// Validation:
//   - amount > 0
//   - amount must not exceed current invoice balance
//   - invoice must belong to the requesting clinic

export async function POST(req, props) {
  const params = await props.params
  const invoiceId = params.invoiceId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const amount = Number(body.amount)
  const mode = typeof body.mode === 'string' ? body.mode : 'Cash'
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const dateStr = typeof body.date === 'string' && body.date ? body.date : null

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, clinicId: ctx.clinicId },
    select: {
      id: true, patientId: true, total: true, paid: true, balance: true,
      status: true, invoiceNo: true,
    },
  })
  if (!invoice) return notFoundResponse()

  const currentBalance = Number(invoice.balance)
  if (currentBalance <= 0) {
    return NextResponse.json({ error: 'Invoice is already fully paid' }, { status: 400 })
  }
  if (amount > currentBalance + 0.5) {
    return NextResponse.json({
      error: 'Amount ₹' + amount + ' exceeds outstanding balance ₹' + currentBalance + '. Record only what was actually received.'
    }, { status: 400 })
  }

  // Date: today by default. If user supplied YYYY-MM-DD, treat as IST midnight.
  const receiptDate = dateStr
    ? new Date(dateStr + 'T00:00:00+05:30')
    : new Date()

  try {
    const result = await db.$transaction(async function(tx) {
      // Create the Receipt
      const receipt = await tx.receipt.create({
        data: {
          clinicId: ctx.clinicId,
          patientId: invoice.patientId,
          amount: amount,
          paymentMode: mode,
          notes: note ? 'Late payment recorded — ' + note : 'Late payment recorded against ' + invoice.invoiceNo,
          date: receiptDate,
          invoiceId: invoice.id,
        },
      })

      // Update Invoice paid + balance + status
      const newPaid = Number(invoice.paid) + amount
      const newBalance = Math.max(0, Number(invoice.total) - newPaid)
      const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIAL'

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paid: newPaid, balance: newBalance, status: newStatus },
      })

      return { receiptId: receipt.id, newBalance, newStatus }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Record payment failed:', err)
    return NextResponse.json({ error: 'Failed to record payment', detail: String(err.message || err) }, { status: 500 })
  }
}
