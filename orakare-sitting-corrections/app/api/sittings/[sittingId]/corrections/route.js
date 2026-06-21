import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/sittings/[sittingId]/corrections
// Body: { note: string }
//
// Appends a timestamped correction note to a sitting. The original sitting
// fields stay immutable. This is the medico-legally defensible pattern:
// audit shows exactly what was originally recorded and what was added later.
//
// Each correction is { note, addedAt, addedBy } where addedBy is the
// Clerk userId of the doctor who added it.

export async function POST(req, props) {
  const params = await props.params
  const sittingId = params.sittingId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const note = typeof body.note === 'string' ? body.note.trim() : ''

  if (!note) {
    return NextResponse.json({ error: 'Correction note cannot be empty' }, { status: 400 })
  }
  if (note.length > 2000) {
    return NextResponse.json({ error: 'Correction note too long (max 2000 characters)' }, { status: 400 })
  }

  const sitting = await db.sitting.findFirst({
    where: { id: sittingId, clinicId: ctx.clinicId },
    select: { id: true, corrections: true },
  })
  if (!sitting) return notFoundResponse()

  const existing = Array.isArray(sitting.corrections) ? sitting.corrections : []
  const updated = existing.concat({
    note,
    addedAt: new Date().toISOString(),
    addedBy: ctx.userId,
  })

  await db.sitting.update({
    where: { id: sittingId },
    data: { corrections: updated },
  })

  return NextResponse.json({ ok: true, correctionCount: updated.length })
}
