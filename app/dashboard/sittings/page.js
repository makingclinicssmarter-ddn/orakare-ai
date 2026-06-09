import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import SittingForm from '@/components/sittings/SittingForm'

export default async function SittingsPage() {
  const { userId } = await auth()

  let doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
  })

  const patients = doctor ? await db.patient.findMany({
    where: { clinicId: doctor.clinicId },
    include: {
      visits: {
        include: {
          treatmentPlan: {
            include: {
              treatmentItems: true,
            }
          },
          medicalHistory: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  }) : []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Add sitting</h1>
        <p className="text-sm text-gray-400 mt-1">
          Record today&apos;s treatment session
        </p>
      </div>
      <SittingForm patients={patients} />
    </div>
  )
}