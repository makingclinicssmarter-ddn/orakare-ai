import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/consultants/[consultantId]/payout
// Body: { amount, mode?, date?, note? }
//
// Records a payout to the consultant. Marks pending FeeEntries as PAID
// in oldest-first order (FIFO across pending fees). If payout < total
// pending, only the oldest entries are marked PAID until the payout is
// consumed. Partial coverage of a single fee entry is NOT supported —
// each entry is atomic. If the payout is less than the oldest entry's
// amount, we cannot mark it PAID; we return an error suggesting she
// either pay the full oldest entry or use a larger amount.
//
// In practice, since fees accrue per-payment, individual entries tend to
// be small, and partial payouts naturally cover several whole entries.

export async function POST(req, props) {
  const params = await props.params
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

  const consultant = await db.consultant.findFirst({
    where: { id: params.consultantId, clinicId: ctx.clinicId },
    select: { id: true, name: true },
  })
  if (!consultant) return notFoundResponse()

  const pending = await db.feeEntry.findMany({
    where: { consultantId: consultant.id, clinicId: ctx.clinicId, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, consultantShare: true, createdAt: true },
  })

  if (pending.length === 0) {
    return NextResponse.json({ error: 'No pending payouts for this consultant' }, { status: 400 })
  }

  const totalPending = pending.reduce(function(s, f) { return s + Number(f.consultantShare || 0) }, 0)
  if (amount > totalPending + 0.5) {
    return NextResponse.json({
      error: 'Amount ₹' + amount.toFixed(0) + ' exceeds total pending ₹' + totalPending.toFixed(0),
    }, { status: 400 })
  }

  const payoutDate = dateStr ? new Date(dateStr + 'T00:00:00+05:30') : new Date()

  // FIFO mark oldest entries PAID until amount exhausted
  const idsToMark = []
  let remaining = amount
  for (const f of pending) {
    const share = Number(f.consultantShare || 0)
    if (share <= remaining + 0.001) {
      idsToMark.push(f.id)
      remaining -= share
    } else {
      // Can't partially-cover a single entry
      break
    }
  }

  if (idsToMark.length === 0) {
    return NextResponse.json({
      error: 'Amount is smaller than the oldest pending fee. Either pay more or settle that fee in full.',
    }, { status: 400 })
  }

  await db.feeEntry.updateMany({
    where: { id: { in: idsToMark } },
    data: {
      status: 'PAID',
      paidDate: payoutDate,
      payMode: mode,
      notes: note || null,
    },
  })

  return NextResponse.json({
    ok: true,
    paidEntries: idsToMark.length,
    paidAmount: amount - remaining,
    remainingPending: totalPending - (amount - remaining),
  })
}
