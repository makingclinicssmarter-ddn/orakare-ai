import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import RecordsView from '@/components/records/RecordsView'

export default async function RecordsPage({ searchParams }) {
  const { userId } = await auth()
  const search = searchParams?.search || ''

  let doctor = await db.doctor.findFirst({
    where: { email: userId },
  })

  const patients = doctor ? await db.patient.findMany({
    where: search ? {
      clinicId: doctor.clinicId,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
      ]
    } : { clinicId: doctor.clinicId },
    include: {
      visits: {
        orderBy: { createdAt: 'desc' },
        include: {
          medicalHistory: true,
          clinicalFindings: true,
          treatmentPlan: {
            include: { treatmentItems: true }
          },
          clinicalRecord: true,
        }
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  }) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Records</h1>
        <p className="text-sm text-gray-400 mt-1">
          Complete patient history — treatments, sittings, balance
        </p>
      </div>
      <RecordsView patients={patients} search={search} />
    </div>
  )
}