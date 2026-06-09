import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const doctor = await db.doctor.findFirst({ where: { clerkId: userId } })
    if (!doctor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const expense = await db.expense.create({
      data: {
        clinicId: doctor.clinicId,
        description: body.description,
        category: body.category || null,
        amount: parseFloat(body.amount || 0),
        date: new Date(body.date + 'T00:00:00+05:30'),
        payee: body.payee || null,
        paymentMode: body.paymentMode || null,
        notes: body.notes || null,
        recurring: body.recurring || false,
      }
    })
    return NextResponse.json({ expense }, { status: 201 })
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
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}