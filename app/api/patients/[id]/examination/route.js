import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

// POST /api/patients/[id]/examination
// Push #4 Wave 2: accepts the new clinicalFindings + radiographicalFindings
// split fields. Legacy `clinicalNotes` still accepted for backward compat
// with older clients, but DentalChart now sends the split fields.

export async function POST(request, props) {
  try {
    const [{ userId }] = await Promise.all([auth()])
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      visitId,
      toothFindings,
      clinicalNotes,           // legacy — keep accepting
      clinicalFindings,        // Push #4 Wave 2
      radiographicalFindings,  // Push #4 Wave 2
    } = body

    // Build the upsert payload. Only set fields that were provided —
    // sending `undefined` to Prisma is treated as "leave as-is".
    const fieldsToWrite = {
      toothFindings,
      examCompletedAt: new Date(),
    }
    if (clinicalFindings !== undefined) fieldsToWrite.clinicalFindings = clinicalFindings
    if (radiographicalFindings !== undefined) fieldsToWrite.radiographicalFindings = radiographicalFindings
    if (clinicalNotes !== undefined) fieldsToWrite.clinicalNotes = clinicalNotes

    const [findings] = await Promise.all([
      db.clinicalFindings.upsert({
        where: { visitId },
        update: fieldsToWrite,
        create: {
          visitId,
          toothFindings: toothFindings || [],
          clinicalNotes: clinicalNotes || null,
          clinicalFindings: clinicalFindings || null,
          radiographicalFindings: radiographicalFindings || null,
          examStartedAt: new Date(),
          examCompletedAt: new Date(),
        },
      }),
      db.visit.update({
        where: { id: visitId },
        data: { status: 'EXAMINATION_DONE' },
      }),
    ])

    return NextResponse.json({ clinicalFindings: findings }, { status: 201 })

  } catch (error) {
    console.error('Examination error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
