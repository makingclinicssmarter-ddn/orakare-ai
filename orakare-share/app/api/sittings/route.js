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
    const {
      patientId, treatmentItemId, visitId,
      date, time, done, prescription, notes,
      paid, payMode, txStatus
    } = body

    if (!patientId || !treatmentItemId || !done) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const sittingDate = new Date(date + 'T' + (time || '09:00') + ':00+05:30')

    const sitting = await db.sitting.create({
      data: {
        clinicId: doctor.clinicId,
        patientId,
        treatmentId: treatmentItemId,
        date: sittingDate,
        done: true,
        description: done || null,
        prescription: prescription || null,
        notes: notes || null,
        consumablesTotal: 0,
        paid: parseFloat(paid || 0),
        payMode: payMode || null,
        savedAt: new Date(),
      }
    })

    if (txStatus === 'COMPLETED') {
      await db.treatmentItem.update({
        where: { id: treatmentItemId },
        data: { consentStatus: 'SIGNED' }
      })
    }

    return NextResponse.json({ sitting }, { status: 201 })

  } catch (error) {
    console.error('Sitting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const treatmentItemId = searchParams.get('treatmentItemId')

    if (!treatmentItemId) {
      return NextResponse.json({ sittings: [] })
    }

    const sittings = await db.sitting.findMany({
      where: { treatmentId: treatmentItemId },
      orderBy: { date: 'desc' },
    })

    const totalPaid = sittings.reduce(function(sum, s) {
      return sum + parseFloat(s.paid || 0)
    }, 0)

    return NextResponse.json({ sittings, totalPaid })

  } catch (error) {
    console.error('Sittings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}