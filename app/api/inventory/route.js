import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const doctor = await db.doctor.findFirst({ where: { email: userId } })
    if (!doctor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const item = await db.inventoryItem.create({
      data: {
        clinicId: doctor.clinicId,
        name: body.name,
        category: body.category || null,
        unit: body.unit || null,
        stockQty: parseFloat(body.stockQty || 0),
        minStock: parseFloat(body.minStock || 0),
        unitCost: parseFloat(body.unitCost || 0),
        supplier: body.supplier || null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        notes: body.notes || null,
      }
    })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...data } = body

    const item = await db.inventoryItem.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.category !== undefined && { category: data.category || null }),
        ...(data.unit !== undefined && { unit: data.unit || null }),
        ...(data.stockQty !== undefined && { stockQty: parseFloat(data.stockQty) }),
        ...(data.minStock !== undefined && { minStock: parseFloat(data.minStock) }),
        ...(data.unitCost !== undefined && { unitCost: parseFloat(data.unitCost) }),
        ...(data.supplier !== undefined && { supplier: data.supplier || null }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        lastUpdated: new Date(),
      }
    })
    return NextResponse.json({ item })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    await db.inventoryItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}