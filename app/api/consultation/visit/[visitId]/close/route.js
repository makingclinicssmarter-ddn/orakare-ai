import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'
import { nextCounter, formatInvoiceNo } from '@/lib/counter'

// POST /api/consultation/visit/[visitId]/close
//
// The atomic close-visit action — Push #3.5 redesign with dual payment streams.
//
// Body shape:
//   {
//     outcome: 'ADVISED' | 'CONSENTED' | 'TREATED',
//     advice: string,
//     visitCharges: {
//       lines: [{ label, category, amount, discount }],
//       inventoryItems: [{ inventoryItemId, name, quantity, unitPrice, discount }],
//       totalDiscount: number,
//       payment: { amount, mode } | null,
//     },
//     treatmentPayment: {
//       totalAmount: number,
//       mode: string,
//       allocations: [{ treatmentId, amount }],   // empty array = don't allocate / advance
//     } | null,
//     nextAppointment: { date: ISO, slot? } | null,
//   }
//
// What this does, in one transaction:
//   1. Update Visit: outcome, advice, nextAppointmentDate, status=COMPLETED, needsResolution=false
//   2. If visit charges exist → create Invoice (kind=VISIT_CHARGES) + InvoiceItems
//   3. If visit-charge payment > 0 → Receipt with invoiceId, no allocations
//   4. If treatment payment > 0 with allocations → Receipt + PaymentAllocations
//   5. If treatment payment > 0 with NO allocations → Receipt with neither (unallocated advance)
//   6. Decrement InventoryItem.stockQty
//   7. Auto-transition any TreatmentItem's parent Treatment from PLANNED → IN_PROGRESS if not already
//      (only for items consented in this visit's plan)
//   8. Create Appointment row if nextApt set

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

  // Fetch visit + linked treatments (for lifecycle transitions)
  const visit = await db.visit.findFirst({
    where: { id: visitId, clinicId: ctx.clinicId },
    select: {
      id: true, patientId: true, doctorId: true, clinicId: true,
      patient: { select: { name: true, mobile: true } },
      treatmentPlan: {
        include: {
          treatmentItems: {
            select: { id: true, consentStatus: true, treatment: { select: { id: true, status: true } } }
          }
        }
      }
    },
  })
  if (!visit) return notFoundResponse()

  // ---- Parse body ----
  const vc = body.visitCharges || {}
  const vcLines = Array.isArray(vc.lines) ? vc.lines : []
  const vcInvItems = Array.isArray(vc.inventoryItems) ? vc.inventoryItems : []
  const vcTotalDiscount = Number.isFinite(Number(vc.totalDiscount)) ? Number(vc.totalDiscount) : 0
  const vcPayment = vc.payment && Number(vc.payment.amount) > 0 ? vc.payment : null

  const tp = body.treatmentPayment
  const hasTreatmentPayment = tp && Number(tp.totalAmount) > 0
  const tpAllocations = (tp && Array.isArray(tp.allocations)) ? tp.allocations : []
  const tpAllocationsTotal = tpAllocations.reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
  const tpAmount = hasTreatmentPayment ? Number(tp.totalAmount) : 0
  // Validate: allocations must not exceed payment amount.
  if (hasTreatmentPayment && tpAllocationsTotal > tpAmount + 0.01) {
    return NextResponse.json({ error: 'Allocations exceed treatment payment amount' }, { status: 400 })
  }

  const nextApt = body.nextAppointment && body.nextAppointment.date ? body.nextAppointment : null

  // ---- Compute visit-charge invoice totals ----
  const chargeLines = vcLines
    .filter(function(c) { return c && c.label && Number(c.amount) > 0 })
    .map(function(c) {
      const gross = Number(c.amount)
      const disc = Number(c.discount) || 0
      return { description: c.label, quantity: 1, unitPrice: gross, discount: disc, total: Math.max(0, gross - disc) }
    })
  const invLines = vcInvItems
    .filter(function(i) { return i && i.inventoryItemId && Number(i.quantity) > 0 })
    .map(function(i) {
      const qty = Number(i.quantity)
      const price = Number(i.unitPrice) || 0
      // Push #4: discount is per-unit, not flat. Total line discount = qty * disc.
      const discPerUnit = Number(i.discount) || 0
      const lineDiscount = qty * discPerUnit
      return {
        inventoryItemId: i.inventoryItemId,
        description: i.name || 'Inventory item',
        quantity: qty,
        unitPrice: price,
        discount: lineDiscount,
        total: Math.max(0, (qty * price) - lineDiscount),
      }
    })
  const allLines = chargeLines.concat(invLines)
  const vcSubtotal = allLines.reduce(function(s, l) { return s + (l.quantity * l.unitPrice) }, 0)
  const vcLineDiscount = allLines.reduce(function(s, l) { return s + l.discount }, 0)
  const vcTotal = Math.max(0, vcSubtotal - vcLineDiscount - vcTotalDiscount)
  const vcPaid = vcPayment ? Number(vcPayment.amount) : 0
  const vcBalance = vcTotal - vcPaid

  // Counter increment outside transaction (acceptable race; gaps are harmless)
  let invoiceNo = null
  if (allLines.length > 0) {
    const seq = await nextCounter(ctx.clinicId, 'INVOICE')
    invoiceNo = formatInvoiceNo(null, seq)
  }

  try {
    const result = await db.$transaction(async function(tx) {
      // 1. Update visit
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

      // 2. Visit-charge invoice (kind=VISIT_CHARGES)
      if (allLines.length > 0) {
        const inv = await tx.invoice.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            invoiceNo: invoiceNo,
            kind: 'VISIT_CHARGES',
            date: new Date(),
            subtotal: vcSubtotal,
            discount: vcLineDiscount + vcTotalDiscount,
            total: vcTotal,
            paid: vcPaid,
            balance: vcBalance,
            paymentMode: vcPayment ? vcPayment.mode : null,
            notes: 'Visit closed — outcome: ' + outcome,
            status: vcPaid >= vcTotal ? 'PAID' : (vcPaid > 0 ? 'PARTIAL' : 'UNPAID'),
          },
        })
        invoiceId = inv.id

        for (const line of allLines) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: inv.id,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              total: line.total,
            },
          })
        }
      }

      // 3. Visit-charge payment receipt
      if (vcPaid > 0) {
        await tx.receipt.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            amount: vcPaid,
            paymentMode: vcPayment.mode || 'Cash',
            notes: 'Visit charges payment',
            date: new Date(),
            invoiceId: invoiceId,
          },
        })
      }

      // 4. Treatment payment receipt + allocations
      if (hasTreatmentPayment) {
        const tpReceipt = await tx.receipt.create({
          data: {
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            amount: tpAmount,
            paymentMode: tp.mode || 'Cash',
            notes: tpAllocations.length > 0
              ? 'Treatment payment (' + tpAllocations.length + ' treatment' + (tpAllocations.length > 1 ? 's' : '') + ')'
              : 'Treatment payment — unallocated',
            date: new Date(),
            invoiceId: null,
          },
        })

        // Create PaymentAllocation rows for each allocation
        for (const a of tpAllocations) {
          if (!a.treatmentId || Number(a.amount) <= 0) continue
          await tx.paymentAllocation.create({
            data: {
              receiptId: tpReceipt.id,
              treatmentId: a.treatmentId,
              amount: Number(a.amount),
            },
          })
        }
      }

      // 5. Decrement inventory stock
      for (const i of invLines) {
        await tx.inventoryItem.update({
          where: { id: i.inventoryItemId },
          data: { stockQty: { decrement: i.quantity } },
        })
      }

      // 6. Treatment lifecycle: PLANNED → IN_PROGRESS for consented items in this visit
      const consentedTreatmentIds = (visit.treatmentPlan?.treatmentItems || [])
        .filter(function(ti) { return ti.consentStatus === 'SIGNED' && ti.treatment })
        .map(function(ti) { return ti.treatment.id })

      if (consentedTreatmentIds.length > 0 && outcome === 'TREATED') {
        await tx.treatment.updateMany({
          where: { id: { in: consentedTreatmentIds }, status: 'PLANNED' },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        })
      }

      // 6b. Push #4: Mark treatments complete if checked on the Close screen.
      // Append "[Completed <date>]" to each Treatment.notes (same convention
      // as the standalone Mark complete endpoint).
      const treatmentsToComplete = Array.isArray(body.treatmentsToComplete) ? body.treatmentsToComplete : []
      if (treatmentsToComplete.length > 0) {
        // Verify these treatments belong to this patient + clinic to avoid
        // cross-tenant marking.
        const validToComplete = await tx.treatment.findMany({
          where: {
            id: { in: treatmentsToComplete },
            clinicId: ctx.clinicId,
            patientId: visit.patientId,
            status: { in: ['PLANNED', 'IN_PROGRESS'] },
          },
          select: { id: true, notes: true },
        })

        const stamp = new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
        })
        const completionLine = '[Completed ' + stamp + ' at visit close]'

        for (const t of validToComplete) {
          const newNotes = t.notes ? t.notes + '\n\n' + completionLine : completionLine
          await tx.treatment.update({
            where: { id: t.id },
            data: { status: 'COMPLETED', completedAt: new Date(), notes: newNotes },
          })
        }
      }

      // 7. Appointment
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

      return { invoiceId, vcTotal, vcPaid, tpAmount }
    }, { maxWait: 10000, timeout: 30000 })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Visit close failed:', err)
    return NextResponse.json({ error: 'Failed to close visit', detail: String(err.message || err) }, { status: 500 })
  }
}
