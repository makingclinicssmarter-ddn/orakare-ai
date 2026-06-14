import { redirect, notFound } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import CloseVisitScreen from '@/components/consultation/CloseVisitScreen'

export default async function CloseVisitPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  // Parallel fetch: visit + clinic + patient's active treatments with paid-so-far.
  const [visit, clinic, activeTxs] = await Promise.all([
    db.visit.findFirst({
      where: { id: visitId, clinicId: ctx.clinicId, patientId: patientId },
      include: {
        patient: { select: { id: true, name: true, mobile: true, age: true, gender: true, originalID: true } },
        treatmentPlan: { include: { treatmentItems: true } },
      },
    }),
    db.clinic.findUnique({ where: { id: ctx.clinicId }, select: { id: true, charges: true } }),
    db.treatment.findMany({
      where: {
        patientId, clinicId: ctx.clinicId,
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
      },
      include: {
        treatmentItem: { select: { consentStatus: true } },
        allocations: { select: { amount: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!visit) notFound()

  const presets = Array.isArray(clinic?.charges) ? clinic.charges.filter(function(c) { return c.active !== false }) : []
  const initialAdvice = visit.advice || ''

  // Compute paid-so-far per treatment from PaymentAllocation
  const activeTreatments = activeTxs.map(function(t) {
    const paidSoFar = (t.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
    return {
      id: t.id,
      type: t.type,
      area: t.area,
      estimate: t.estimate,
      discount: t.discount,
      paidSoFar,
      status: t.status,
    }
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <CloseVisitScreen
        visit={{
          id: visit.id,
          patient: visit.patient,
          currentOutcome: visit.outcome,
          status: visit.status,
          hasConsentedItems: (visit.treatmentPlan?.treatmentItems || []).some(function(i) { return i.consentStatus === 'SIGNED' }),
          hasTreatmentPlan: !!visit.treatmentPlan,
        }}
        presets={presets}
        initialAdvice={initialAdvice}
        clinicId={ctx.clinicId}
        activeTreatments={activeTreatments}
      />
    </div>
  )
}
