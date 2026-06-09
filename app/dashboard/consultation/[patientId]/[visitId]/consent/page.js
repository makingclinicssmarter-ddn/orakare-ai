import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import ConsentScreen from '@/components/consultation/ConsentScreen'

export default async function ConsentPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const [{ userId }, patient, visit] = await Promise.all([
    auth(),
    db.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        mobile: true,
        originalID: true,
        dentalHistory: true,
        personalHistory: true,
      }
    }),
    db.visit.findUnique({
      where: { id: visitId },
      include: {
        medicalHistory: true,
        treatmentPlan: {
          include: { treatmentItems: true }
        }
      }
    }),
  ])

  if (!patient || !visit) notFound()

  if (!visit.treatmentPlan) {
    return (
      <ConsultationLayout
        patient={patient}
        visit={visit}
        visitId={visitId}
        patientId={patientId}
        activeStep={4}
      >
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-medium text-amber-800">No treatment plan found</p>
            <p className="text-xs text-amber-600 mt-1">
              Please create a treatment plan before taking consent.
            </p>
          </div>
        </div>
      </ConsultationLayout>
    )
  }

  return (
    <ConsultationLayout
      patient={patient}
      visit={visit}
      visitId={visitId}
      patientId={patientId}
      activeStep={4}
    >
      <div className="p-6 max-w-2xl">
        <h2 className="text-base font-medium text-slate-900 mb-1">Treatment consent</h2>
        <p className="text-sm text-slate-500 mb-6">
          Patient must consent to the treatment plan before sittings can begin
        </p>
        <ConsentScreen
          patient={patient}
          visitId={visitId}
          patientId={patientId}
          items={visit.treatmentPlan.treatmentItems}
        />
      </div>
    </ConsultationLayout>
  )
}