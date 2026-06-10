import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDoctorContext,
  verifyVisitAccess,
  verifyTreatmentItemsAccess,
  unauthorized,
  forbidden,
} from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { visitId, itemIds, signatureData, physicalForm, status } = body

    if (!visitId || !Array.isArray(itemIds) || itemIds.length === 0 || !status) {
      return NextResponse.json({ error: 'visitId, itemIds and status required' }, { status: 400 })
    }

    const visit = await verifyVisitAccess(visitId, clinicId)
    if (!visit) return forbidden('Visit not in your clinic')

    // Confirm every treatment item belongs to this clinic. Reject the whole
    // request if any are mixed-tenant — never partially apply consent.
    const allowed = await verifyTreatmentItemsAccess(itemIds, clinicId)
    if (allowed.length !== itemIds.length) {
      return forbidden('One or more treatment items not in your clinic')
    }

    await db.$transaction(async (tx) => {
      await tx.treatmentItem.updateMany({
        where: { id: { in: itemIds } },
        data: {
          consentStatus: status,
          consentSignedAt: new Date(),
          consentDocUrl: physicalForm ? 'physical-form' : signatureData,
        },
      })
      await tx.visit.update({
        where: { id: visitId },
        data: { status: 'TREATMENT_CONSENT_SIGNED' },
      })

      // Auto-create Treatment execution rows for newly consented items
      if (status === 'SIGNED') {
        const fullVisit = await tx.visit.findUnique({
          where: { id: visitId },
          include: {
            treatmentPlan: {
              include: {
                treatmentItems: { where: { id: { in: itemIds } } },
              },
            },
          },
        })

        const existing = await tx.treatment.findMany({
          where: { treatmentItemId: { in: itemIds } },
          select: { treatmentItemId: true },
        })
        const existingIds = new Set(existing.map(function(t) { return t.treatmentItemId }))

        const itemsToCreate = (fullVisit.treatmentPlan?.treatmentItems || [])
          .filter(function(item) { return !existingIds.has(item.id) })

        if (itemsToCreate.length > 0) {
          await tx.treatment.createMany({
            data: itemsToCreate.map(function(item) {
              return {
                clinicId,
                patientId: fullVisit.patientId,
                visitId,
                type: item.procedureName,
                area: item.toothRef || null,
                estimate: item.estimatedCost || 0,
                expectedSittings: item.estimatedSessions || 1,
                status: 'PLANNED',
                treatmentItemId: item.id,
              }
            }),
          })
        }
      }
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Bulk consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
