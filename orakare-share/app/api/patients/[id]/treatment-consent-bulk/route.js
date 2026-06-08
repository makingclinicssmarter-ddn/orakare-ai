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
    const { visitId, itemIds, signatureData, physicalForm, status } = body

    await db.treatmentItem.updateMany({
      where: { id: { in: itemIds } },
      data: {
        consentStatus: status,
        consentSignedAt: new Date(),
        consentDocUrl: physicalForm ? 'physical-form' : signatureData,
      },
    })

    await db.visit.update({
      where: { id: visitId },
      data: { status: 'TREATMENT_CONSENT_SIGNED' },
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Bulk consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}