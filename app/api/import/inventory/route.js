import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items } = body

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    let imported = 0
    let failed = 0

    for (const item of items) {
      try {
        if (!item.name) { failed++; continue }

        const expiryDate = item.expiryDate || item.expiry
          ? new Date(item.expiryDate || item.expiry)
          : null

        await db.inventoryItem.create({
          data: {
            clinicId: doctor.clinicId,
            name: item.name,
            category: item.category || null,
            unit: item.unit || null,
            stockQty: parseFloat(item.stockQty || item.stock || 0),
            minStock: parseFloat(item.minStock || item.min || 0),
            unitCost: parseFloat(item.unitCost || item.cost || 0),
            supplier: item.supplier || null,
            expiryDate: expiryDate && !isNaN(expiryDate.getTime()) ? expiryDate : null,
            notes: item.notes || null,
          }
        })
        imported++
      } catch (e) {
        console.error('Inventory import error:', e.message)
        failed++
      }
    }

    return NextResponse.json({ imported, failed }, { status: 200 })

  } catch (error) {
    console.error('Inventory import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}