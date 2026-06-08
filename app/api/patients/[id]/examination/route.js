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
    const { visitId, toothFindings, clinicalNotes } = body

    const [clinicalFindings] = await Promise.all([
      db.clinicalFindings.upsert({
        where: { visitId },
        update: { toothFindings, clinicalNotes, examCompletedAt: new Date() },
        create: { visitId, toothFindings, clinicalNotes, examStartedAt: new Date(), examCompletedAt: new Date() },
      }),
      db.visit.update({
        where: { id: visitId },
        data: { status: 'EXAMINATION_DONE' },
      }),
    ])

    return NextResponse.json({ clinicalFindings }, { status: 201 })

  } catch (error) {
    console.error('Examination error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}