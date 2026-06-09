import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { treatmentItemId, patientId, visitId, date, description, notes, paid, payMode } = body

    const doctor = await db.doctor.findFirst({ where: { email: userId } })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Create sitting linked to TreatmentItem
    const sitting = await db.sitting.create({
      data: {
        treatmentId: treatmentItemId,
        patientId,
        clinicId: doctor.clinicId,
        date: new Date(date),
        description,
        notes,
        paid: paid || 0,
        payMode,
        done: true,
      }
    })

    // If payment collected, create receipt and allocate to Treatment
    if (paid > 0) {
      // Find the Treatment record linked to this TreatmentItem
      const treatment = await db.treatment.findFirst({
        where: { treatmentItemId }
      })

      const receipt = await db.receipt.create({
        data: {
          clinicId: doctor.clinicId,
          patientId,
          amount: paid,
          paymentMode: payMode,
          notes: 'Sitting payment — ' + (description || ''),
          date: new Date(date),
        }
      })

      // Allocate to Treatment if it exists
      if (treatment) {
        await db.paymentAllocation.create({
          data: {
            receiptId: receipt.id,
            treatmentId: treatment.id,
            amount: paid,
          }
        })
      }

      // Update Treatment status to IN_PROGRESS
      if (treatment) {
        await db.treatment.update({
          where: { id: treatment.id },
          data: { status: 'IN_PROGRESS' }
        })
      }
    }

    return NextResponse.json({ sitting }, { status: 201 })

  } catch (error) {
    console.error('Sitting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}