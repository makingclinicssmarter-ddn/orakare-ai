import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import ClinicalRecord from '@/components/patients/ClinicalRecord'

export default async function RecordPage(props) {
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
          },
          clinicalRecord: true,
        }
      }
    }
  })

  if (!patient) notFound()

  const latestVisit = patient.visits[0]

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={'/dashboard/patients/' + id + '/treatment'} className="text-sm text-gray-400 hover:text-gray-600">
          Back to treatment plan
        </Link>
        <h1 className="text-xl font-medium text-gray-900 mt-2">{patient.name}</h1>
        <p className="text-sm text-gray-500">Clinical record</p>
      </div>

      <ClinicalRecord
        patient={patient}
        visitId={latestVisit?.id}
        visit={latestVisit}
        existing={latestVisit?.clinicalRecord}
      />
    </div>
  )
}