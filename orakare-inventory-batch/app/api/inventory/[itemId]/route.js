import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'
import { summarizeBatches } from '@/lib/inventory-fifo'

export async function GET(_req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const item = await db.inventoryItem.findFirst({
    where: { id: params.itemId, clinicId: ctx.clinicId },
    include: {
      batches: {
        orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        include: {
          expense: { select: { id: true, description: true, amount: true } },
        },
      },
    },
  })
  if (!item) return notFoundResponse()

  const summary = summarizeBatches(item.batches)
  return NextResponse.json({ item, summary })
}

export async function PATCH(req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })

  const existing = await db.inventoryItem.findFirst({
    where: { id: params.itemId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!existing) return notFoundResponse()

  const data = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.category !== undefined) data.category = body.category || null
  if (body.unit !== undefined) data.unit = body.unit || null
  if (body.unitCost !== undefined) {
    const n = Number(body.unitCost)
    if (Number.isFinite(n)) data.unitCost = n
  }
  if (body.supplier !== undefined) data.supplier = body.supplier || null
  if (body.minOrderQty !== undefined) {
    const n = Number(body.minOrderQty)
    if (Number.isFinite(n) && n >= 0) data.minOrderQty = n
  }
  if (typeof body.trackExpiry === 'boolean') data.trackExpiry = body.trackExpiry
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  await db.inventoryItem.update({ where: { id: params.itemId }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req, props) {
  // Soft-delete only: sets isActive = false. Preserves history.
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const existing = await db.inventoryItem.findFirst({
    where: { id: params.itemId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!existing) return notFoundResponse()

  await db.inventoryItem.update({
    where: { id: params.itemId },
    data: { isActive: false },
  })
  return NextResponse.json({ ok: true })
}
