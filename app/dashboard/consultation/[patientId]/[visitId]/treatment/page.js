import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import TreatmentPlan from '@/components/patients/TreatmentPlan'

export default async function TreatmentPage(props) {
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
        clinicalFindings: true,
        treatmentPlan: {
          include: { treatmentItems: true }
        }
      }
    }),
  ])

  if (!patient || !visit) notFound()

  return (
    <ConsultationLayout
      patient={patient}
      visit={visit}
      visitId={visitId}
      patientId={patientId}
      activeStep={3}
    >
      <div className="p-6">
        <TreatmentPlan
          patient={patient}
          visitId={visitId}
          findings={visit.clinicalFindings}
          medicalHistory={visit.medicalHistory}
          existing={visit.treatmentPlan}
          nextUrl={'/dashboard/consultation/' + patientId + '/' + visitId + '/consent'}
        />
      </div>
    </ConsultationLayout>
  )
}