import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import MedicalHistoryForm from '@/components/patients/MedicalHistoryForm'
import ExamConsent from '@/components/patients/ExamConsent'
import PatientProgress from '@/components/patients/PatientProgress'

export default async function PatientDetailPage(props) {
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
          examConsent: true,
          clinicalFindings: true,
        }
      }
    }
  })

  if (!patient) notFound()

  const latestVisit = patient.visits[0]
  const existingHistory = latestVisit?.medicalHistory
  const existingConsent = latestVisit?.examConsent
  const existingFindings = latestVisit?.clinicalFindings

  return (
    <div>
      <PatientProgress
        patientId={id}
        visitStatus={latestVisit?.status}
      />
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/patients" className="text-sm text-gray-400 hover:text-gray-600">
            Back to queue
          </Link>
          <h1 className="text-xl font-medium text-gray-900 mt-2">{patient.name}</h1>
          <p className="text-sm text-gray-500">{patient.age}y · {patient.gender} · {patient.mobile}</p>
        </div>

        <div className="space-y-4">
          <MedicalHistoryForm
            patient={patient}
            visitId={latestVisit?.id}
            existing={existingHistory}
          />

          {existingHistory && (
            <ExamConsent
              patient={patient}
              visitId={latestVisit?.id}
              existing={existingConsent}
            />
          )}

          {existingConsent && (
            <Link
              href={'/dashboard/patients/' + id + '/examination'}
              className="block w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium text-center hover:bg-indigo-700 transition"
            >
              {existingFindings ? 'View examination' : 'Start examination'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}