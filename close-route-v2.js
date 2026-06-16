import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'
import { nextCounter, formatInvoiceNo } from '@/lib/counter'

// POST /api/consultation/visit/[visitId]/close
//
// The atomic "close-visit" action. Body shape:
//   {
//     outcome: 'ADVISED' | 'CONSENTED' | 'TREATED',
//     advice: string,
//     charges: [{ label, category, amount, discount }],
//     inventoryItems: [{ inventoryItemId, quantity, unitPrice, discount }],
//     payment: { amount, mode } | null,
//     totalDiscount: number,
//     nextAppointment: { date: string ISO, slot?: string } | null
//   }
//
// What this endpoint does, all in one transaction:
//   1. Update Visit: outcome, advice, nextAppointmentDate, needsResolution=false,
//      status=COMPLETED.
//   2. If there are any charges OR inventoryItems → create Invoice + InvoiceItems.
//   3. If payment.amount > 0 → create Receipt (no PaymentAllocation since this
//      may not map to a specific treatment).
//   4. Decrement InventoryItem.stockQty for each dispensed item.
//   5. If nextAppointment → create an Appointment row.
//
// On any failure the whole transaction rolls back.

export async function POST(req, props) {
  const params = await props.params
  const visitId = params.visitId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const outcome = body.outcome
  if (!['ADVISED', 'CONSENTED', 'TREATED'].includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  // Verify the visit belongs to this clinic + grab patient name/phone for
  // the Appointment record (Appointment.name is required even when a Patient
  // is linked — schema legacy from walk-in support).
  const visit = await db.visit.findFirst({
    where: { id: visitId, clinicId: ctx.clinicId },
    select: {
      id: true, patientId: true, doctorId: true, clinicId: true,
      patient: { select: { name: true, mobile: true } },
    },
  })
  if (!visit) return notFoundResponse()

  const charges = Array.isArray(body.charges) ? body.charges : []
  const invItems = Array.isArray(body.inventoryItems) ? body.inventoryItems : []
  const payment = body.payment && Number(body.payment.amount) > 0 ? body.payment : null
  const totalDiscount = Number.isFinite(Number(body.totalDiscount)) ? Number(body.totalDiscount) : 0
  const nextApt = body.nextAppointment && body.nextAppointment.date ? body.nextAppointment : null

  // Pre-compute invoice totals
  const chargeLines = charges
    .filter(function(c) { return c && c.label && Number(c.amount) > 0 })
    .map(function(c) {
      const qty = 1
      const gross = Number(c.amount)
      const disc = Number(c.discount) || 0
      return {
        description: c.label,
        category: c.category || 'OTHER',
        quantity: qty,
        unitPrice: gross,
        discount: disc,
        total: Math.max(0, gross - disc),
      }
    })

  const invLines = invItems
    .filter(function(i) { return i && i.inventoryItemId && Number(i.quantity) > 0 })
    .map(function(i) {
      const qty = Number(i.quantity)
      const price = Number(i.unitPrice) || 0
      const disc = Number(i.discount) || 0
      return {
        inventoryItemId: i.inventoryItemId,
        description: i.name || 'Inventory item',
        quantity: qty,
        unitPrice: price,
        discount: disc,
        total: Math.max(0, (qty * price) - disc),
      }
    })

  const allLines = chargeLines.concat(invLines)
  const subtotal = allLines.reduce(function(s, l) { return s + (l.quantity * l.unitPrice) }, 0)
  const linewiseDiscount = allLines.reduce(function(s, l) { return s + l.discount }, 0)
  const totalAfterLineDiscount = subtotal - linewiseDiscount
  const grandTotal = Math.max(0, totalAfterLineDiscount - totalDiscount)
  const paid = payment ? Number(payment.amount) : 0
  const balance = grandTotal - paid

  // Counter increment is done OUTSIDE the transaction because our nextCounter
  // helper doesn't accept a tx client (Push #4 todo). Worst case is a skipped
  // invoice number if the transaction below fails — harmless gap, not duplicate.
  let invoiceNo = null
  if (chargeLines.length > 0 || invItems.length > 0) {
    const seq = await nextCounter(ctx.clinicId, 'INVOICE')
    invoiceNo = formatInvoiceNo(null, seq)
  }

  try {
    const result = await db.$transaction(async function(tx) {
      // 1. Update the visit
      await tx.visit.update({
        where: { id: visitId },
        data: {
          outcome: outcome,
          advice: body.advice ? String(body.advice).trim() : null,
          nextAppointmentDate: nextApt ? new Date(nextApt.date) : null,
          needsResolution: false,
          status: 'COMPLETED',
        },
      })

      let invoiceId = null

      // 2. Create invoice if there are line items
      if (allLines.length > 0) {
        const invoice = await tx.invoice.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            invoiceNo: invoiceNo,
            date: new Date(),
            subtotal: subtotal,
            discount: linewiseDiscount + totalDiscount,
            total: grandTotal,
            paid: paid,
            balance: balance,
            paymentMode: payment ? payment.mode : null,
            notes: 'Visit closed — outcome: ' + outcome,
            status: paid >= grandTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID'),
          },
        })
        invoiceId = invoice.id

        for (const line of allLines) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              total: line.total,
            },
          })
        }
      }

      // 3. Receipt for payment
      if (paid > 0) {
        await tx.receipt.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            amount: paid,
            paymentMode: payment.mode || 'Cash',
            notes: 'Visit close payment' + (invoiceId ? ' (invoice linked)' : ''),
            date: new Date(),
            invoiceId: invoiceId,
          },
        })
      }

      // 4. Decrement inventory stock
      for (const i of invLines) {
        await tx.inventoryItem.update({
          where: { id: i.inventoryItemId },
          data: { stockQty: { decrement: i.quantity } },
        })
      }

      // 5. Next appointment row
      if (nextApt) {
        await tx.appointment.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            name: visit.patient?.name || 'Patient',
            phone: visit.patient?.mobile || null,
            date: new Date(nextApt.date),
            slot: nextApt.slot || null,
            notes: 'Scheduled at visit close',
            status: 'SCHEDULED',
          },
        })
      }

      return { invoiceId, grandTotal, paid }
    }, { maxWait: 10000, timeout: 30000 })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Visit close failed:', err)
    return NextResponse.json({ error: 'Failed to close visit', detail: String(err.message || err) }, { status: 500 })
  }
}
