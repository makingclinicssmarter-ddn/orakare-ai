import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/inventory/[itemId]/restock
// Body: { quantity, unitCost, expiryDate?, receivedDate?, batchCode?, supplier?, notes?, createExpense? }
//
// Creates a new InventoryBatch. If createExpense is true (default), also
// creates a linked Expense entry in a single transaction.

export async function POST(req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })

  const item = await db.inventoryItem.findFirst({
    where: { id: params.itemId, clinicId: ctx.clinicId },
    select: { id: true, name: true, trackExpiry: true, supplier: true, unit: true },
  })
  if (!item) return notFoundResponse()

  const quantity = parseInt(body.quantity, 10)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 })
  }
  const unitCost = Number(body.unitCost)
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    return NextResponse.json({ error: 'Unit cost is required (₹0 or higher)' }, { status: 400 })
  }

  let expiryDate = null
  if (item.trackExpiry) {
    if (!body.expiryDate) {
      return NextResponse.json({ error: 'Expiry date is required for this item' }, { status: 400 })
    }
    expiryDate = new Date(String(body.expiryDate) + 'T00:00:00+05:30')
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 })
    }
  }

  let receivedDate = new Date()
  if (body.receivedDate) {
    receivedDate = new Date(String(body.receivedDate) + 'T00:00:00+05:30')
    if (isNaN(receivedDate.getTime())) receivedDate = new Date()
  }

  const supplier = body.supplier || item.supplier || null
  const batchCode = (body.batchCode && String(body.batchCode).trim()) || null
  const notes = body.notes || null
  const createExpense = body.createExpense !== false

  try {
    const result = await db.$transaction(async function(tx) {
      let expenseId = null
      if (createExpense) {
        const totalCost = unitCost * quantity
        const expense = await tx.expense.create({
          data: {
            clinicId: ctx.clinicId,
            description: 'Inventory restock — ' + item.name + ' (' + quantity + (item.unit ? ' ' + item.unit : '') + ')',
            category: 'Inventory',
            amount: totalCost,
            date: receivedDate,
            payee: supplier,
            paymentMode: null,
            notes: notes,
          },
        })
        expenseId = expense.id
      }

      const batch = await tx.inventoryBatch.create({
        data: {
          clinicId: ctx.clinicId,
          inventoryItemId: item.id,
          batchCode,
          quantity,
          initialQuantity: quantity,
          unitCost,
          expiryDate,
          receivedDate,
          supplier,
          expenseId,
          notes,
          status: 'ACTIVE',
        },
      })

      // Keep InventoryItem.unitCost as the latest known cost (handy for reporting)
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { unitCost, lastUpdated: new Date() },
      })

      return { batchId: batch.id, expenseId }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Restock failed:', err)
    return NextResponse.json({ error: 'Failed to restock', detail: String(err.message || err) }, { status: 500 })
  }
}
