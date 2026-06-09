import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request, props) {
  try {
    const [{ userId }] = await Promise.all([auth()])
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { visitId, itemIds, signatureData, physicalForm, status } = body

    await Promise.all([
      db.treatmentItem.updateMany({
        where: { id: { in: itemIds } },
        data: {
          consentStatus: status,
          consentSignedAt: new Date(),
          consentDocUrl: physicalForm ? 'physical-form' : signatureData,
        },
      }),
      db.visit.update({
        where: { id: visitId },
        data: { status: 'TREATMENT_CONSENT_SIGNED' },
      }),
    ])

    // Auto-create Treatment records from consented TreatmentItems
    if (status === 'SIGNED') {
      const [doctor, visit] = await Promise.all([
        db.doctor.findFirst({ where: { email: userId } }),
        db.visit.findUnique({
          where: { id: visitId },
          include: {
            treatmentPlan: {
              include: {
                treatmentItems: {
                  where: { id: { in: itemIds } }
                }
              }
            }
          }
        })
      ])

      if (doctor && visit) {
        const existingTreatments = await db.treatment.findMany({
          where: { treatmentItemId: { in: itemIds } },
          select: { treatmentItemId: true }
        })

        const existingIds = new Set(existingTreatments.map(function(t) {
          return t.treatmentItemId
        }))

        const itemsToCreate = visit.treatmentPlan?.treatmentItems?.filter(
          function(item) { return !existingIds.has(item.id) }
        ) || []

        if (itemsToCreate.length > 0) {
          await db.treatment.createMany({
            data: itemsToCreate.map(function(item) {
              return {
                clinicId: doctor.clinicId,
                patientId: visit.patientId,
                visitId: visitId,
                type: item.procedureName,
                area: item.toothRef || null,
                estimate: item.estimatedCost || 0,
                expectedSittings: item.estimatedSessions || 1,
                status: 'PLANNED',
                treatmentItemId: item.id,
              }
            })
          })
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Bulk consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}