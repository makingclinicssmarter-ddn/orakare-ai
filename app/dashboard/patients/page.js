import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import PatientsPage from '@/components/patients/PatientsPage'

export default async function Page() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
  })

  const [totalCount, recentPatients] = await Promise.all([
    db.patient.count({
      where: { clinicId: doctor.clinicId },
    }),
    db.patient.findMany({
      where: { clinicId: doctor.clinicId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
  ])

  return (
    <PatientsPage
      doctor={doctor}
      recentPatients={recentPatients}
      totalCount={totalCount}
    />
  )
}