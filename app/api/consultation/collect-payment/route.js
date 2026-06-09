import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { patientId, amount, paymentMode, notes } = body

    const doctor = await db.doctor.findFirst({ where: { clerkId: userId } })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const receipt = await db.receipt.create({
      data: {
        clinicId: doctor.clinicId,
        patientId,
        amount,
        paymentMode,
        notes: notes || 'General payment',
        date: new Date(),
      }
    })

    return NextResponse.json({ receipt }, { status: 201 })

  } catch (error) {
    console.error('Collect payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}