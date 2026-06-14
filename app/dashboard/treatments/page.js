import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import TreatmentsList from '@/components/treatments/TreatmentsList'

export default async function TreatmentsPage({ searchParams }) {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  const sp = await searchParams
  const status = sp?.status || 'ACTIVE'  // ACTIVE = PLANNED + IN_PROGRESS
  const q = sp?.q || ''

  const where = { clinicId: ctx.clinicId }
  if (status === 'ALL') {
    // no filter
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
      treatmentItem: { select: { sittings: { select: { id: true } } } },
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
      paid,
      balance: Math.max(0, est - paid),
      sittingsCount: sittings.length,
      expectedSittings: t.expectedSittings,
      startedAt: t.startedAt,
      patient: t.patient,
    }
  })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-slate-900">Treatments</h1>
        <p className="text-sm text-slate-500 mt-1">All running treatments across patients. Click any treatment to add a sitting or mark complete.</p>
      </div>
      <TreatmentsList initialRows={rows} initialStatus={status} initialQuery={q} />
    </div>
  )
}
