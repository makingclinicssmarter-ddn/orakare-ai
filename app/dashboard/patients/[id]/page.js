import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import MedicalHistoryForm from '@/components/patients/MedicalHistoryForm'

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
        }
      }
    }
  })

  if (!patient) notFound()

  const latestVisit = patient.visits[0]
  const existingHistory = latestVisit?.medicalHistory

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/patients" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to queue
        </Link>
        <h1 className="text-xl font-medium text-gray-900 mt-2">{patient.name}</h1>
        <p className="text-sm text-gray-500">{patient.age}y · {patient.gender} · {patient.mobile}</p>
      </div>

      <MedicalHistoryForm
        patient={patient}
        visitId={latestVisit?.id}
        existing={existingHistory}
      />
    </div>
  )
}