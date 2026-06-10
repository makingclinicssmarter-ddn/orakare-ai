import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { itemId, status } = body
    if (!itemId || !status) {
      return NextResponse.json({ error: 'itemId and status required' }, { status: 400 })
    }

    // Verify the item belongs to this clinic via its treatment plan's visit
    const owned = await db.treatmentItem.findFirst({
      where: { id: itemId, treatmentPlan: { visit: { clinicId } } },
      select: { id: true, treatmentPlanId: true },
    })
    if (!owned) return forbidden('Treatment item not in your clinic')

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.treatmentItem.update({
        where: { id: itemId },
        data: { consentStatus: status, consentSignedAt: new Date() },
      })

      const plan = await tx.treatmentPlan.findUnique({
        where: { id: updated.treatmentPlanId },
        include: { treatmentItems: true },
      })

      const allDone = plan.treatmentItems.every(function(i) {
        return i.consentStatus === 'SIGNED' || i.consentStatus === 'DECLINED'
      })
      if (allDone) {
        await tx.visit.update({
          where: { id: plan.visitId },
          data: { status: 'TREATMENT_CONSENT_SIGNED' },
        })
      }
      return updated
    })

    return NextResponse.json({ item: result }, { status: 200 })

  } catch (error) {
    console.error('Treatment consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
