import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/treatments/[treatmentId]/complete
// Body: { completionNote: string }
//
// Marks a treatment as COMPLETED. Sets completedAt and appends the completion
// note to Treatment.notes. Clinically/medico-legally significant action — we
// require a (possibly empty) note field to give Dr. Shobhna a structured
// moment to record how the treatment ended.

export async function POST(req, props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const note = typeof body.completionNote === 'string' ? body.completionNote.trim() : ''

  const treatment = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId },
    select: { id: true, status: true, notes: true },
  })
  if (!treatment) return notFoundResponse()

  if (treatment.status === 'COMPLETED') {
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  // Append the completion note to existing notes, preserving history.
  const stamp = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
  const completionLine = '[Completed ' + stamp + ']' + (note ? ' ' + note : '')
  const newNotes = treatment.notes ? treatment.notes + '\n\n' + completionLine : completionLine

  await db.treatment.update({
    where: { id: treatmentId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      notes: newNotes,
    },
  })

  return NextResponse.json({ ok: true })
}
