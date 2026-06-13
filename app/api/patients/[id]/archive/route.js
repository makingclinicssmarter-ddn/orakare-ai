import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyPatientAccess, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/patients/[id]/archive
// Body: { archived: true | false }
// Toggles archivedAt on a patient. Clinic-scoped via verifyPatientAccess.
export async function POST(req, props) {
  const params = await props.params
  const id = params.id

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const patient = await verifyPatientAccess(id, ctx.clinicId)
  if (!patient) return notFoundResponse()

  const body = await req.json().catch(function() { return {} })
  const shouldArchive = body.archived !== false  // default to archiving

  const updated = await db.patient.update({
    where: { id },
    data: { archivedAt: shouldArchive ? new Date() : null },
    select: { id: true, name: true, archivedAt: true },
  })

  return NextResponse.json({ ok: true, patient: updated })
}
