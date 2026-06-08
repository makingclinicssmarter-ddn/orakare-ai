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
    const { visitId, signatureData } = body

    const [examConsent] = await Promise.all([
      db.examConsent.upsert({
        where: { visitId },
        update: { signatureUrl: signatureData },
        create: { visitId, signatureUrl: signatureData },
      }),
      db.visit.update({
        where: { id: visitId },
        data: { status: 'EXAM_CONSENT_SIGNED' },
      }),
    ])

    return NextResponse.json({ examConsent }, { status: 201 })

  } catch (error) {
    console.error('Exam consent error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}