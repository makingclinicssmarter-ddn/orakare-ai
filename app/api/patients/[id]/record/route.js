import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDoctorContext,
  verifyVisitAccess,
  unauthorized,
  forbidden,
  notFoundResponse,
} from '@/lib/auth-helpers'

export async function POST(request, props) {
  try {
    const { userId, clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const params = await props.params
    const body = await request.json()
    const { visitId, action, recordId } = body

    if (action === 'generate') {
      if (!visitId) return NextResponse.json({ error: 'visitId required' }, { status: 400 })

      const ok = await verifyVisitAccess(visitId, clinicId)
      if (!ok) return forbidden('Visit not in your clinic')

      const visit = await db.visit.findUnique({
        where: { id: visitId },
        include: {
          medicalHistory: true,
          clinicalFindings: true,
          treatmentPlan: { include: { treatmentItems: true } },
          examConsent: true,
        },
      })
      if (!visit) return notFoundResponse('Visit not found')

      const fhirBundle = {
        resourceType: 'Bundle',
        type: 'document',
        timestamp: new Date().toISOString(),
        entry: [
          { resource: { resourceType: 'Patient', id: params.id } },
          {
            resource: {
              resourceType: 'ClinicalImpression',
              status: 'completed',
              finding: Object.entries(visit.clinicalFindings?.toothFindings || {}).map(function(entry) {
                return { itemCodeableConcept: { text: 'Tooth ' + entry[0] + ': ' + entry[1] } }
              }),
              note: [{ text: visit.clinicalFindings?.clinicalNotes || '' }],
            },
          },
          {
            resource: {
              resourceType: 'CarePlan',
              status: 'active',
              activity: (visit.treatmentPlan?.treatmentItems || []).map(function(item) {
                return {
                  detail: {
                    description: item.procedureName,
                    status: item.consentStatus === 'SIGNED' ? 'scheduled' : 'not-started',
                  },
                }
              }),
            },
          },
        ],
      }

      const record = await db.$transaction(async (tx) => {
        const r = await tx.clinicalRecord.upsert({
          where: { visitId },
          update: { fhirBundle, generatedAt: new Date() },
          create: { visitId, fhirBundle, generatedAt: new Date() },
        })
        await tx.visit.update({
          where: { id: visitId },
          data: { status: 'COMPLETED' },
        })
        return r
      })

      return NextResponse.json({ record }, { status: 200 })
    }

    if (action === 'lock') {
      if (!recordId) return NextResponse.json({ error: 'recordId required' }, { status: 400 })

      const owned = await db.clinicalRecord.findFirst({
        where: { id: recordId, visit: { clinicId } },
        select: { id: true },
      })
      if (!owned) return forbidden('Record not in your clinic')

      const record = await db.clinicalRecord.update({
        where: { id: recordId },
        data: { lockedAt: new Date(), lockedBy: userId },
      })
      return NextResponse.json({ record }, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Record error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
