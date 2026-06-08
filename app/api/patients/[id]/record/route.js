import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request, props) {
  try {
    const [{ userId }] = await Promise.all([auth()])
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await props.params
    const body = await request.json()
    const { visitId, action, recordId } = body

    if (action === 'generate') {
      const visit = await db.visit.findUnique({
        where: { id: visitId },
        include: {
          medicalHistory: true,
          clinicalFindings: true,
          treatmentPlan: { include: { treatmentItems: true } },
          examConsent: true,
        }
      })

      if (!visit) {
        return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
      }

      const fhirBundle = {
        resourceType: 'Bundle',
        type: 'document',
        timestamp: new Date().toISOString(),
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: params.id,
            }
          },
          {
            resource: {
              resourceType: 'ClinicalImpression',
              status: 'completed',
              finding: Object.entries(visit.clinicalFindings?.toothFindings || {}).map(function(entry) {
                return { itemCodeableConcept: { text: 'Tooth ' + entry[0] + ': ' + entry[1] } }
              }),
              note: [{ text: visit.clinicalFindings?.clinicalNotes || '' }]
            }
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
                  }
                }
              })
            }
          }
        ]
      }

      const [record] = await Promise.all([
        db.clinicalRecord.upsert({
          where: { visitId },
          update: { fhirBundle, generatedAt: new Date() },
          create: { visitId, fhirBundle, generatedAt: new Date() },
        }),
        db.visit.update({
          where: { id: visitId },
          data: { status: 'COMPLETED' },
        }),
      ])

      return NextResponse.json({ record }, { status: 200 })
    }

    if (action === 'lock') {
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