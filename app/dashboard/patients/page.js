import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import PatientQueue from '@/components/patients/PatientQueue'

export default async function PatientsPage() {
  const { userId } = await auth()

  const patients = await db.patient.findMany({
    where: {
      visits: {
        some: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      },
    },
    include: {
      visits: {
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return <PatientQueue patients={patients} />
}