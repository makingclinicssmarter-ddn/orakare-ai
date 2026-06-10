import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDoctorContext,
  verifyPatientAccess,
  unauthorized,
  forbidden,
} from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId, doctorId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { patientId } = body
    if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

    const patient = await verifyPatientAccess(patientId, clinicId)
    if (!patient) return forbidden('Patient not in your clinic')

    // Resume an in-flight visit if there is one (clinic-scoped)
    const incompleteVisit = await db.visit.findFirst({
      where: {
        patientId,
        clinicId,
        status: { notIn: ['COMPLETED'] },
      },
      include: {
        treatmentPlan: { include: { treatmentItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (incompleteVisit) {
      const hasConsentedItems = incompleteVisit.treatmentPlan?.treatmentItems?.some(
        function(item) { return item.consentStatus === 'SIGNED' }
      )
      return NextResponse.json({
        visitId: incompleteVisit.id,
        resuming: true,
        goTo: hasConsentedItems ? 'sittings' : getResumeScreen(incompleteVisit.status),
      })
    }

    const visit = await db.visit.create({
      data: { patientId, clinicId, doctorId, status: 'REGISTERED' },
    })

    return NextResponse.json({ visitId: visit.id, resuming: false, goTo: 'start' })

  } catch (error) {
    console.error('Consultation start error:', error)
    return NextResponse.json({ error: 'Failed to start consultation' }, { status: 500 })
  }
}

function getResumeScreen(status) {
  switch (status) {
    case 'REGISTERED':              return 'start'
    case 'HISTORY_TAKEN':           return 'examination'
    case 'EXAM_CONSENT_SIGNED':     return 'examination'
    case 'EXAMINATION_DONE':        return 'treatment'
    case 'TREATMENT_PLANNED':       return 'consent'
    case 'TREATMENT_CONSENT_SIGNED':return 'sittings'
    default:                        return 'start'
  }
}
