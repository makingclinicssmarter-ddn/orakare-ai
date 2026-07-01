import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'
import { nextCounter, formatInvoiceNo } from '@/lib/counter'
import { planFifoDispense } from '@/lib/inventory-fifo'

/**
 * Counter sale — over-the-counter billing for inventory items.
 *
 * Push #13b: added per-item discount + bill-level discount.
 *
 * Line total = qty * unitPrice - itemDiscount    (never negative)
 * Grand total = sum(lineTotals) - billDiscount    (never negative)
 * Payment amount MUST equal grandTotal.
 */

export async function POST(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })

  const patientId = body.patientId ? String(body.patientId).trim() : null
  const walkInName = body.walkInName ? String(body.walkInName).trim() : ''
  const walkInPhone = body.walkInPhone ? String(body.walkInPhone).trim() : ''
  const items = Array.isArray(body.items) ? body.items : []
  const billDiscount = Math.max(0, Number(body.billDiscount) || 0)
  const payment = body.payment && typeof body.payment === 'object' ? body.payment : null

  if (items.length === 0) {
    return NextResponse.json({ error: 'At least one item is required' }, { status: 400 })
  }

  const cleanItems = []
  for (const it of items) {
    const inventoryItemId = it.inventoryItemId ? String(it.inventoryItemId) : null
    const description = it.description ? String(it.description).trim() : ''
    const quantity = Number(it.quantity) || 0
    const unitPrice = Number(it.unitPrice) || 0
    const discount = Math.max(0, Number(it.discount) || 0)
    if (!inventoryItemId || !description || quantity <= 0 || unitPrice < 0) {
      return NextResponse.json({ error: 'Each item needs an inventoryItemId, description, positive quantity, and non-negative price' }, { status: 400 })
    }
    cleanItems.push({ inventoryItemId, description, quantity, unitPrice, discount })
  }

  // Compute totals
  const itemsSubtotal = cleanItems.reduce(function(s, i) {
    return s + Math.max(0, i.quantity * i.unitPrice - i.discount)
  }, 0)
  const grandTotal = Math.max(0, itemsSubtotal - billDiscount)
  const totalItemDiscount = cleanItems.reduce(function(s, i) { return s + i.discount }, 0)
  const totalDiscount = totalItemDiscount + billDiscount
  const grossSubtotal = cleanItems.reduce(function(s, i) { return s + i.quantity * i.unitPrice }, 0)

  if (!payment || Number(payment.amount) <= 0) {
    return NextResponse.json({ error: 'Payment amount required' }, { status: 400 })
  }
  const payAmount = Number(payment.amount)
  const payMode = typeof payment.mode === 'string' && payment.mode ? payment.mode : 'Cash'

  if (Math.abs(payAmount - grandTotal) > 0.5) {
    return NextResponse.json({
      error: 'Payment must equal total. Total ₹' + grandTotal.toFixed(0) + ', received ₹' + payAmount.toFixed(0),
    }, { status: 400 })
  }

  if (patientId) {
    const p = await db.patient.findFirst({
      where: { id: patientId, clinicId: ctx.clinicId },
      select: { id: true },
    })
    if (!p) return NextResponse.json({ error: 'Patient not found in this clinic' }, { status: 400 })
  }

  // FIFO plan
  const fifoPlans = {}
  for (let idx = 0; idx < cleanItems.length; idx++) {
    const item = cleanItems[idx]
    const batches = await db.inventoryBatch.findMany({
      where: {
        clinicId: ctx.clinicId,
        inventoryItemId: item.inventoryItemId,
        status: 'ACTIVE',
        quantity: { gt: 0 },
      },
      select: { id: true, quantity: true, expiryDate: true, receivedDate: true, unitCost: true, status: true },
    })
    const plan = planFifoDispense(batches, item.quantity)
    if (plan.shortBy > 0) {
      return NextResponse.json({
        error: 'Not enough stock for "' + item.description + '". Short by ' + plan.shortBy + '. Restock or reduce quantity.',
      }, { status: 400 })
    }
    fifoPlans[idx] = plan.allocations
  }

  const seq = await nextCounter(ctx.clinicId, 'INVOICE')
  const invoiceNo = formatInvoiceNo(null, seq)

  try {
    const result = await db.$transaction(async function(tx) {
      const invoice = await tx.invoice.create({
        data: {
          clinicId: ctx.clinicId,
          patientId: patientId || null,
          invoiceNo,
          kind: 'OTC_SALE',
          date: new Date(),
          subtotal: grossSubtotal,
          discount: totalDiscount,
          total: grandTotal,
          paid: grandTotal,
          balance: 0,
          status: 'PAID',
          notes: patientId
            ? null
            : ('Walk-in' + (walkInName ? ': ' + walkInName : '') + (walkInPhone ? ' · ' + walkInPhone : '')),
        },
      })

      for (let idx = 0; idx < cleanItems.length; idx++) {
        const item = cleanItems[idx]
        const batchAllocations = fifoPlans[idx] || []
        const lineTotal = Math.max(0, item.quantity * item.unitPrice - item.discount)
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: lineTotal,
            batchAllocations: batchAllocations,
          },
        })
      }

      // If bill-level discount > 0, record as a synthetic line item for transparency
      if (billDiscount > 0) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description: 'Bill discount',
            quantity: 1,
            unitPrice: -billDiscount,
            total: -billDiscount,
            batchAllocations: [],
          },
        })
      }

      const receipt = await tx.receipt.create({
        data: {
          clinicId: ctx.clinicId,
          patientId: patientId || null,
          invoiceId: invoice.id,
          date: new Date(),
          amount: payAmount,
          paymentMode: payMode,
          notes: 'Counter sale',
        },
      })

      // Decrement batches per FIFO plan
      for (let idx = 0; idx < cleanItems.length; idx++) {
        const plan = fifoPlans[idx] || []
        for (const alloc of plan) {
          const updated = await tx.inventoryBatch.update({
            where: { id: alloc.batchId },
            data: { quantity: { decrement: alloc.qty } },
            select: { quantity: true },
          })
          if (updated.quantity <= 0) {
            await tx.inventoryBatch.update({
              where: { id: alloc.batchId },
              data: { status: 'DEPLETED' },
            })
          }
        }
      }

      return { invoiceId: invoice.id, invoiceNo, receiptId: receipt.id, total: grandTotal }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save counter sale: ' + (e.message || 'unknown') }, { status: 500 })
  }
}
