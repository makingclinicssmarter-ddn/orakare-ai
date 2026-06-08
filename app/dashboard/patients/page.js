import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import PatientQueue from '@/components/patients/PatientQueue'

export default async function PatientsPage({ searchParams }) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const search = searchParams?.search || ''

  const [{ userId }, todayPatients, allPatients] = await Promise.all([
    auth(),
    db.patient.findMany({
      where: {
        visits: { some: { createdAt: { gte: todayStart } } }
      },
      include: {
        visits: {
          where: { createdAt: { gte: todayStart } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.patient.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
        ]
      } : {},
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return (
    <PatientQueue
      patients={todayPatients}
      allPatients={allPatients}
      search={search}
    />
  )
}