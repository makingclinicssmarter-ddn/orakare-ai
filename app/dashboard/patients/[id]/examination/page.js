import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import ExaminationView from '@/components/patients/ExaminationView'

export default async function ExaminationPage(props) {
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

  if (!latestVisit?.examConsent) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link href={`/dashboard/patients/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to patient
        </Link>
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-800">Examination consent required</p>
          <p className="text-xs text-amber-600 mt-1">Patient must sign examination consent before proceeding.</p>
          <Link href={`/dashboard/patients/${id}`} className="inline-block mt-3 text-sm text-amber-700 underline">
            Go back to get consent →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/dashboard/patients/${id}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to patient
        </Link>
        <h1 className="text-xl font-medium text-gray-900 mt-2">{patient.name}</h1>
        <p className="text-sm text-gray-500">
          {latestVisit?.medicalHistory?.chiefComplaint || 'No chief complaint recorded'}
        </p>
      </div>

      <ExaminationView
  patient={patient}
  visitId={latestVisit?.id}
  existing={latestVisit?.clinicalFindings}
/>
  <div className="mt-6">
  <Link
    href={`/dashboard/patients/${id}/treatment`}
    className="block w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium text-center hover:bg-indigo-700 transition"
  >
    Proceed to treatment plan →
  </Link>
</div>  
    </div>
  )
}