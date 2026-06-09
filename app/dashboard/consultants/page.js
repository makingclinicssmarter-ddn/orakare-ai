import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import ConsultantsView from '@/components/consultants/ConsultantsView'

export default async function ConsultantsPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
  })

  const consultants = doctor ? await db.consultant.findMany({
    where: { clinicId: doctor.clinicId },
    orderBy: { name: 'asc' },
  }) : []

  const feeEntries = doctor ? await db.feeEntry.findMany({
    where: { clinicId: doctor.clinicId },
    orderBy: { createdAt: 'desc' },
    include: { consultant: true },
  }) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Consultants</h1>
        <p className="text-sm text-gray-400 mt-1">
          Visiting doctors and revenue sharing
        </p>
      </div>
      <ConsultantsView consultants={consultants} feeEntries={feeEntries} />
    </div>
  )
}