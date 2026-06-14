import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/visits/[visitId]/advice
// Body: { advice: string }
//
// Persists Visit.advice early — while Dr. Shobhna is still on the Treatment
// Plan screen. Pre-fills on the Close-visit screen later, but she can still
// edit it there. Idempotent: re-sending overwrites.
export async function POST(req, props) {
  const params = await props.params
  const visitId = params.visitId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const visit = await db.visit.findFirst({
    where: { id: visitId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!visit) return notFoundResponse()

  const body = await req.json().catch(function() { return {} })
  const advice = typeof body.advice === 'string' ? body.advice.trim() : ''

  await db.visit.update({
    where: { id: visitId },
    data: { advice: advice || null },
  })

  return NextResponse.json({ ok: true })
}
