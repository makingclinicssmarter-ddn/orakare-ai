import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import ExaminationView from '@/components/patients/ExaminationView'

export default async function ExaminationPage(props) {
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
      }
    }),
  ])

  if (!patient || !visit) notFound()

  return (
    <ConsultationLayout
      patient={patient}
      visit={visit}
      visitId={visitId}
      activeStep={2}
      patientId={patientId}
    >
      <div className="p-4">
        <ExaminationView
          patient={patient}
          visitId={visitId}
          existing={visit.clinicalFindings}
          nextUrl={'/dashboard/consultation/' + patientId + '/' + visitId + '/treatment'}
        />
      </div>
    </ConsultationLayout>
  )
}