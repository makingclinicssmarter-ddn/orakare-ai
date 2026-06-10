import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { visitId, toothFindings, clinicalNotes } = body

    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

    const visit = await verifyVisitAccess(visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    const result = await db.$transaction(async (tx) => {
      const clinicalFindings = await tx.clinicalFindings.upsert({
        where: { visitId },
        update: { toothFindings, clinicalNotes, examCompletedAt: new Date() },
        create: {
          visitId, toothFindings, clinicalNotes,
          examStartedAt: new Date(),
          examCompletedAt: new Date(),
        },
      })
      await tx.visit.update({
        where: { id: visitId },
        data: { status: 'EXAMINATION_DONE' },
      })
      return clinicalFindings
    })

    return NextResponse.json({ clinicalFindings: result }, { status: 201 })

  } catch (error) {
    console.error('Examination error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
