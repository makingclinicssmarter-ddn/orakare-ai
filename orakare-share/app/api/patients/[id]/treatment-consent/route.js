import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request, props) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, status } = body

    if (!itemId || !status) {
      return NextResponse.json({ error: 'itemId and status required' }, { status: 400 })
    }

    const item = await db.treatmentItem.update({
      where: { id: itemId },
      data: {
        consentStatus: status,
        consentSignedAt: new Date(),
      },
    })

    const plan = await db.treatmentPlan.findUnique({
      where: { id: item.treatmentPlanId },
      include: { treatmentItems: true },
    })

    const allDone = plan.treatmentItems.every(function(i) {
      return i.consentStatus === 'SIGNED' || i.consentStatus === 'DECLINED'
    })

    if (allDone) {
      await db.visit.update({
        where: { id: plan.visitId },
        data: { status: 'TREATMENT_CONSENT_SIGNED' },
      })
    }

    return NextResponse.json({ item }, { status: 200 })

  } catch (error) {
    console.error('Treatment consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}