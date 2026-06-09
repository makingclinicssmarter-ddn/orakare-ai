import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { treatmentId, patientId, visitId, date, description, notes, paid, payMode } = body

    const doctor = await db.doctor.findFirst({ where: { email: userId } })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    const [sitting] = await Promise.all([
      db.sitting.create({
        data: {
          treatmentId,
          patientId,
          clinicId: doctor.clinicId,
          date: new Date(date),
          description,
          notes,
          paid: paid || 0,
          payMode,
          done: true,
        }
      }),
      db.treatment.update({
        where: { id: treatmentId },
        data: { status: 'IN_PROGRESS' }
      }),
    ])

    // If payment collected, create receipt and allocate
    if (paid > 0) {
      const receipt = await db.receipt.create({
        data: {
          clinicId: doctor.clinicId,
          patientId,
          amount: paid,
          paymentMode: payMode,
          notes: 'Sitting payment — ' + description,
          date: new Date(date),
        }
      })

      await db.paymentAllocation.create({
        data: {
          receiptId: receipt.id,
          treatmentId,
          amount: paid,
        }
      })
    }

    return NextResponse.json({ sitting }, { status: 201 })

  } catch (error) {
    console.error('Sitting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}