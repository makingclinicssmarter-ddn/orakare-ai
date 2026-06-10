import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDoctorContext,
  verifyVisitAccess,
  verifyPatientAccess,
  unauthorized,
  forbidden,
} from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { treatmentItemId, patientId, visitId, date, description, notes, paid, payMode } = body

    if (!treatmentItemId || !patientId) {
      return NextResponse.json({ error: 'treatmentItemId and patientId required' }, { status: 400 })
    }

    // Verify patient + treatment item both belong to this clinic
    const [patient, treatmentItem] = await Promise.all([
      verifyPatientAccess(patientId, clinicId),
      db.treatmentItem.findFirst({
        where: { id: treatmentItemId, treatmentPlan: { visit: { clinicId } } },
        select: { id: true },
      }),
    ])
    if (!patient || !treatmentItem) {
      return forbidden('Patient or treatment item not in your clinic')
    }

    if (visitId) {
      const v = await verifyVisitAccess(visitId, clinicId)
      if (!v) return forbidden('Visit not in your clinic')
    }

    const sitting = await db.$transaction(async (tx) => {
      const created = await tx.sitting.create({
        data: {
          treatmentId: treatmentItemId,
          patientId,
          clinicId,
          date: new Date(date),
          description,
          notes,
          paid: paid || 0,
          payMode,
          done: true,
        },
      })

      if (paid > 0) {
        const treatment = await tx.treatment.findFirst({ where: { treatmentItemId } })

        const receipt = await tx.receipt.create({
          data: {
            clinicId,
            patientId,
            amount: paid,
            paymentMode: payMode,
            notes: 'Sitting payment — ' + (description || ''),
            date: new Date(date),
          },
        })

        if (treatment) {
          await tx.paymentAllocation.create({
            data: { receiptId: receipt.id, treatmentId: treatment.id, amount: paid },
          })
          await tx.treatment.update({
            where: { id: treatment.id },
            data: { status: 'IN_PROGRESS' },
          })
        }
      }

      return created
    })

    return NextResponse.json({ sitting }, { status: 201 })

  } catch (error) {
    console.error('Sitting error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
