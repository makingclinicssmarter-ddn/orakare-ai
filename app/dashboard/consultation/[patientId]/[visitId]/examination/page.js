import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import ExaminationView from '@/components/patients/ExaminationView'

export default async function ExaminationPage(props) {
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
      include: { medicalHistory: true, clinicalFindings: true },
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
