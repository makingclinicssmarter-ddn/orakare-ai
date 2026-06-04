import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request, { params }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { visitId, chiefComplaint, conditions, allergies, medications } = body

    if (!chiefComplaint) {
      return NextResponse.json({ error: 'Chief complaint is required' }, { status: 400 })
    }

    const medicalHistory = await db.medicalHistory.upsert({
      where: { visitId },
      update: {
        chiefComplaint,
        conditions,
        allergies,
        medications,
      },
      create: {
        visitId,
        chiefComplaint,
        conditions,
        allergies,
        medications,
        collectedBy: 'receptionist',
      },
    })

    await db.visit.update({
      where: { id: visitId },
      data: { status: 'HISTORY_TAKEN' },
    })

    return NextResponse.json({ medicalHistory }, { status: 201 })

  } catch (error) {
    console.error('Medical history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}