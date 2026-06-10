import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import StartVisit from '@/components/consultation/StartVisit'

export default async function StartPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const { clinicId } = await getDoctorContext()
  if (!clinicId) redirect('/sign-in')

  const [patient, visit] = await Promise.all([
    db.patient.findFirst({
      where: { id: patientId, clinicId },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        mobile: true,
        address: true,
        originalID: true,
        dentalHistory: true,
        personalHistory: true,
        visits: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            createdAt: true,
            medicalHistory: { select: { chiefComplaint: true } },
            treatmentPlan: {
              select: {
                treatmentItems: {
                  select: {
                    procedureName: true,
                    toothRef: true,
                    consentStatus: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.visit.findFirst({
      where: { id: visitId, clinicId },
      select: {
        id: true,
        status: true,
        medicalHistory: {
          select: {
            chiefComplaint: true,
            conditions: true,
            allergies: true,
            medications: true,
          },
        },
      },
    }),
  ])

  if (!patient || !visit) notFound()

  return (
    <StartVisit
      patient={patient}
      visit={visit}
      visitId={visitId}
    />
  )
}
