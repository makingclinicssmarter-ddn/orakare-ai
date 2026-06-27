import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import AppointmentsView from '@/components/appointments/AppointmentsView'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage(props) {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  const searchParams = (await props.searchParams) || {}
  const view = searchParams.view === 'list' ? 'list' : 'day'
  const dayParam = typeof searchParams.day === 'string' ? searchParams.day : null

  // Determine the day to focus on. Default: today (in IST).
  // For list view, we still pass today as anchor; the view itself shows ±range.
  const now = new Date()
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate())
  const focusDay = dayParam ? new Date(dayParam + 'T00:00:00+05:30') : today

  // For day view: fetch ±1 day around focus to handle timezone edge cases
  const fetchFrom = new Date(focusDay.getTime() - 7 * 24 * 60 * 60 * 1000)  // 7 days back
  const fetchTo = new Date(focusDay.getTime() + 60 * 24 * 60 * 60 * 1000)   // 60 days ahead

  const appointments = await db.appointment.findMany({
    where: {
      clinicId: ctx.clinicId,
      date: { gte: fetchFrom, lt: fetchTo },
    },
    orderBy: { date: 'asc' },
    include: {
      patient: { select: { id: true, name: true, originalID: true, mobile: true } },
    },
    take: 500,
  })

  return (
    <AppointmentsView
      appointments={appointments}
      initialView={view}
      focusDayIso={focusDay.toISOString()}
    />
  )
}
