import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import TreatmentPlan from '@/components/patients/TreatmentPlan'
import PatientProgress from '@/components/patients/PatientProgress'

export default async function TreatmentPage(props) {
  const { userId } = await auth()
  const params = await props.params
  const id = params.id

  if (!id) notFound()

  const patient = await db.patient.findUnique({
    where: { id: id },
    include: {
      visits: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          medicalHistory: true,
          clinicalFindings: true,
          treatmentPlan: {
            include: {
              treatmentItems: true,
            }
          }
        }
      }
    }
  })

  if (!patient) notFound()

  const latestVisit = patient.visits[0]

  if (!latestVisit?.clinicalFindings) {
    return (
      <div>
        <PatientProgress patientId={id} visitStatus={latestVisit?.status} />
        <div className="p-6 max-w-2xl mx-auto">
          <Link href={'/dashboard/patients/' + id + '/examination'} className="text-sm text-gray-400 hover:text-gray-600">
            Back to examination
          </Link>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-medium text-amber-800">Examination required first</p>
            <p className="text-xs text-amber-600 mt-1">Complete the examination before creating a treatment plan.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PatientProgress patientId={id} visitStatus={latestVisit?.status} />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href={'/dashboard/patients/' + id + '/examination'} className="text-sm text-gray-400 hover:text-gray-600">
            Back to examination
          </Link>
          <h1 className="text-xl font-medium text-gray-900 mt-2">{patient.name}</h1>
          <p className="text-sm text-gray-500">Treatment planning</p>
        </div>
        <TreatmentPlan
          patient={patient}
          visitId={latestVisit?.id}
          findings={latestVisit?.clinicalFindings}
          medicalHistory={latestVisit?.medicalHistory}
          existing={latestVisit?.treatmentPlan}
        />
      </div>
    </div>
  )
}