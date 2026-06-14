import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

// GET /api/treatments?status=IN_PROGRESS|PLANNED|COMPLETED|ALL&q=<text>
// Returns treatments for the Treatments tab. Default: status=IN_PROGRESS.
// Optional q text-matches patient name / patient ID / treatment type.

export async function GET(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'IN_PROGRESS'
  const q = (searchParams.get('q') || '').trim()

  const where = { clinicId: ctx.clinicId }
  if (status === 'ALL') {
    // no filter on status
  } else if (status === 'ACTIVE') {
    where.status = { in: ['PLANNED', 'IN_PROGRESS'] }
  } else {
    where.status = status
  }

  if (q) {
    where.OR = [
      { type: { contains: q, mode: 'insensitive' } },
      { area: { contains: q, mode: 'insensitive' } },
      { patient: { name: { contains: q, mode: 'insensitive' } } },
      { patient: { originalID: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const treatments = await db.treatment.findMany({
    where,
    include: {
      patient: { select: { id: true, name: true, originalID: true, mobile: true } },
      treatmentItem: {
        select: {
          sittings: { select: { id: true, date: true } },
        },
      },
      allocations: { select: { amount: true } },
    },
    orderBy: [{ status: 'asc' }, { startedAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  })

  const rows = treatments.map(function(t) {
    const sittings = t.treatmentItem?.sittings || []
    const paid = (t.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
    const est = (Number(t.estimate) || 0) - (Number(t.discount) || 0)
    return {
      id: t.id,
      type: t.type,
      area: t.area,
      status: t.status,
      estimate: est,
      paid: paid,
      balance: Math.max(0, est - paid),
      sittingsCount: sittings.length,
      expectedSittings: t.expectedSittings,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      patient: t.patient,
    }
  })

  return NextResponse.json({ treatments: rows })
}
