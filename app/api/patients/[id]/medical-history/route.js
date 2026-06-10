import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { visitId, chiefComplaint, conditions, allergies, medications } = body

    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    if (!chiefComplaint) return NextResponse.json({ error: 'Chief complaint is required' }, { status: 400 })

    const visit = await verifyVisitAccess(visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    const result = await db.$transaction(async (tx) => {
      const medicalHistory = await tx.medicalHistory.upsert({
        where: { visitId },
        update: { chiefComplaint, conditions, allergies, medications },
        create: { visitId, chiefComplaint, conditions, allergies, medications, collectedBy: 'receptionist' },
      })
      await tx.visit.update({
        where: { id: visitId },
        data: { status: 'HISTORY_TAKEN' },
      })
      return medicalHistory
    })

    return NextResponse.json({ medicalHistory: result }, { status: 201 })

  } catch (error) {
    console.error('Medical history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
