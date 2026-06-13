import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import PatientsPage from '@/components/patients/PatientsPage'

export default async function Page() {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  // Parallel: separate active vs archived counts, plus the patient list itself
  // (including both active and archived — client filters by toggle).
  const [activeCount, archivedCount, recentPatients] = await Promise.all([
    db.patient.count({
      where: { clinicId: ctx.clinicId, archivedAt: null },
    }),
    db.patient.count({
      where: { clinicId: ctx.clinicId, archivedAt: { not: null } },
    }),
    db.patient.findMany({
      where: { clinicId: ctx.clinicId },
      orderBy: [{ archivedAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
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
      doctor={{ id: ctx.userId }}
      recentPatients={recentPatients}
      activeCount={activeCount}
      archivedCount={archivedCount}
    />
  )
}
