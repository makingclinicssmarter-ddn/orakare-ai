import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'
import { summarizeBatches } from '@/lib/inventory-fifo'

// GET /api/inventory?q=<text>&category=<text>&showInactive=true
// POST /api/inventory   — create a new inventory item

export async function GET(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const category = (searchParams.get('category') || '').trim()
  const showInactive = searchParams.get('showInactive') === 'true'

  const where = { clinicId: ctx.clinicId }
  if (!showInactive) where.isActive = true
  if (category) where.category = category
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { supplier: { contains: q, mode: 'insensitive' } },
    ]
  }

  const items = await db.inventoryItem.findMany({
    where,
    include: {
      batches: {
        where: { status: { in: ['ACTIVE', 'EXPIRED'] } },
        select: { id: true, quantity: true, expiryDate: true, receivedDate: true, status: true, unitCost: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = items.map(function(it) {
    const summary = summarizeBatches(it.batches)
    return {
      id: it.id,
      name: it.name,
      category: it.category,
      unit: it.unit,
      unitCost: it.unitCost,
      supplier: it.supplier,
      minOrderQty: it.minOrderQty,
      trackExpiry: it.trackExpiry,
      isActive: it.isActive,
      totalActive: summary.totalActive,
      totalAtRisk: summary.totalAtRisk,
      expiredQty: summary.expiredQty,
      oldestExpiry: summary.oldestExpiry,
      batchCount: summary.batchCount,
      lowStock: summary.totalActive < it.minOrderQty,
    }
  })

  return NextResponse.json({ items: rows })
}

export async function POST(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const created = await db.inventoryItem.create({
    data: {
      clinicId: ctx.clinicId,
      name,
      category: body.category || null,
      unit: body.unit || null,
      unitCost: Number.isFinite(Number(body.unitCost)) ? Number(body.unitCost) : null,
      supplier: body.supplier || null,
      minOrderQty: Number.isFinite(Number(body.minOrderQty)) ? Number(body.minOrderQty) : 5,
      trackExpiry: body.trackExpiry !== false,
      isActive: true,
      stockQty: 0,  // legacy field — batches are source of truth
    },
  })

  return NextResponse.json({ ok: true, item: created })
}
