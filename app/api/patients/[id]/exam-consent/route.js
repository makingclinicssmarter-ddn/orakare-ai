import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { visitId, signatureData } = body
    if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

    const visit = await verifyVisitAccess(visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    const result = await db.$transaction(async (tx) => {
      const examConsent = await tx.examConsent.upsert({
        where: { visitId },
        update: { signatureUrl: signatureData },
        create: { visitId, signatureUrl: signatureData },
      })
      await tx.visit.update({
        where: { id: visitId },
        data: { status: 'EXAM_CONSENT_SIGNED' },
      })
      return examConsent
    })

    return NextResponse.json({ examConsent: result }, { status: 201 })

  } catch (error) {
    console.error('Exam consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
