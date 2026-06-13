import { redirect, notFound } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import CloseVisitScreen from '@/components/consultation/CloseVisitScreen'

export default async function CloseVisitPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  // Fetch visit + clinic charges in parallel.
  // Visit fetch is clinic-scoped through the patient relation already loaded.
  const [visit, clinic] = await Promise.all([
    db.visit.findFirst({
      where: { id: visitId, clinicId: ctx.clinicId, patientId: patientId },
      include: {
        patient: {
          select: { id: true, name: true, mobile: true, age: true, gender: true, originalID: true },
        },
        treatmentPlan: { include: { treatmentItems: true } },
      },
    }),
    db.clinic.findUnique({
      where: { id: ctx.clinicId },
      select: { id: true, charges: true },
    }),
  ])

  if (!visit) notFound()

  const presets = Array.isArray(clinic?.charges) ? clinic.charges.filter(function(c) { return c.active !== false }) : []

  // Carry forward advice if it was entered on Plan screen
  const initialAdvice = visit.advice || ''

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
      />
    </div>
  )
}
