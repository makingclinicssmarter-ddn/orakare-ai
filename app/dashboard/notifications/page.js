import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import NotificationsView from '@/components/notifications/NotificationsView'

export default async function NotificationsPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { email: userId },
    include: { clinic: true }
  })

  if (!doctor) return null

  const clinicId = doctor.clinicId
  const now = new Date()
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1); yesterday.setHours(0,0,0,0)
  const yesterdayEnd = new Date(); yesterdayEnd.setDate(yesterdayEnd.getDate()-1); yesterdayEnd.setHours(23,59,59,999)
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate()-7)
  const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate()-3)
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30)
  const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate()-60)

  const [
    todayAppointments,
    yesterdaySittings,
    activeTreatmentItems,
    allSittings,
    reviewSittings,
  ] = await Promise.all([
    db.appointment.findMany({
      where: { clinicId, date: { gte: todayStart, lte: todayEnd }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      orderBy: { date: 'asc' },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: yesterday, lte: yesterdayEnd } },
      include: { patient: true },
    }),
    db.treatmentItem.findMany({
      where: { consentStatus: 'SIGNED', treatmentPlan: { visit: { clinicId } } },
      include: {
        treatmentPlan: {
          include: { visit: { include: { patient: true } } }
        }
      }
    }),
    db.sitting.findMany({
      where: { clinicId },
      orderBy: { date: 'desc' },
      include: { patient: true },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: sevenDaysAgo, lte: threeDaysAgo } },
      include: { patient: true },
    }),
  ])

  const sittingsByPatient = {}
  allSittings.forEach(function(s) {
    if (!sittingsByPatient[s.patientId]) sittingsByPatient[s.patientId] = []
    sittingsByPatient[s.patientId].push(s)
  })

  const overduePatients = []
  const checkinPatients = []
  const seenIds = new Set()

  activeTreatmentItems.forEach(function(item) {
    const patient = item.treatmentPlan?.visit?.patient
    if (!patient || seenIds.has(patient.id)) return
    const patientSittings = (sittingsByPatient[patient.id] || []).sort(function(a, b) { return new Date(b.date) - new Date(a.date) })
    const lastSitting = patientSittings[0]
    const lastDate = lastSitting ? new Date(lastSitting.date) : null
    const daysSince = lastDate ? Math.round((now - lastDate) / (1000*60*60*24)) : 999
    seenIds.add(patient.id)
    if (daysSince >= 60) {
      overduePatients.push({ patient, treatment: item.procedureName, daysSince })
    } else if (daysSince >= 7) {
      checkinPatients.push({ patient, treatment: item.procedureName, daysSince })
    }
  })

  const reviewPatientIds = new Set()
  const reviewPatients = []
  reviewSittings.forEach(function(s) {
    if (!s.patient || reviewPatientIds.has(s.patientId)) return
    reviewPatientIds.add(s.patientId)
    reviewPatients.push({ patient: s.patient, sittingDate: s.date })
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-400 mt-1">WhatsApp messages for patients — Hindi and English</p>
      </div>
      <NotificationsView
        clinicName={doctor.clinic?.name || 'Orakare Dental Clinic'}
        todayAppointments={todayAppointments}
        yesterdaySittings={yesterdaySittings}
        checkinPatients={checkinPatients}
        overduePatients={overduePatients}
        reviewPatients={reviewPatients}
      />
    </div>
  )
}