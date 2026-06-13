import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

// GET /api/inventory/search?q=<text>
// Returns up to 15 InventoryItems matching `q` (name OR category, case-insensitive),
// scoped to the current clinic. Used by the close-visit InventoryPicker.
export async function GET(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  // Empty query → return top 15 by name. Lets the picker show "what's in stock"
  // even before the dentist types anything.
  const where = {
    clinicId: ctx.clinicId,
    ...(q ? {
      OR: [
        { name:     { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const items = await db.inventoryItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      stockQty: true,
      unitCost: true,
    },
    orderBy: { name: 'asc' },
    take: 15,
  })

  return NextResponse.json({ items })
}
