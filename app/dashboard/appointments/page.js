import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import AppointmentCalendar from '@/components/appointments/AppointmentCalendar'

export default async function AppointmentsPage({ searchParams }) {
  const { userId } = await auth()

  const dateParam = searchParams?.date
  const selectedDate = dateParam ? new Date(dateParam) : new Date()
  selectedDate.setHours(0, 0, 0, 0)

  const nextDay = new Date(selectedDate)
  nextDay.setDate(nextDay.getDate() + 1)

  let doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
    include: { clinic: true }
  })

  const appointments = doctor ? await db.appointment.findMany({
    where: {
      clinicId: doctor.clinicId,
      date: {
        gte: selectedDate,
        lt: nextDay,
      }
    },
    include: {
      patient: true,
    },
    orderBy: { date: 'asc' },
  }) : []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Appointments</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage your clinic schedule
        </p>
      </div>
      <AppointmentCalendar
        appointments={appointments}
        selectedDate={selectedDate.toISOString()}
        clinicId={doctor?.clinicId}
      />
    </div>
  )
}