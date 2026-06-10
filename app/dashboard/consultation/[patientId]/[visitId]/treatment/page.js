import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import TreatmentPlan from '@/components/patients/TreatmentPlan'

export default async function TreatmentPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const { clinicId } = await getDoctorContext()
  if (!clinicId) redirect('/sign-in')

  const [patient, visit] = await Promise.all([
    db.patient.findFirst({
      where: { id: patientId, clinicId },
      select: {
        id: true, name: true, age: true, gender: true, mobile: true,
        originalID: true, dentalHistory: true, personalHistory: true,
      },
    }),
    db.visit.findFirst({
      where: { id: visitId, clinicId },
      include: {
        medicalHistory: true,
        clinicalFindings: true,
        treatmentPlan: { include: { treatmentItems: true } },
      },
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
