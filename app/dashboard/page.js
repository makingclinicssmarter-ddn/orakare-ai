import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import DashboardView from '@/components/dashboard/DashboardView'

export default async function DashboardPage() {
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1); yesterday.setHours(0,0,0,0)
  const yesterdayEnd = new Date(); yesterdayEnd.setDate(yesterdayEnd.getDate()-1); yesterdayEnd.setHours(23,59,59,999)
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth()-5, 1)

  const [
    todayAppointments,
    monthSittings,
    allPatients,
    activeTreatmentItems,
    allTreatmentItems,
    lowStockItems,
    expiringItems,
    pendingFees,
    monthExpenses,
    sixMonthSittings,
    sixMonthExpenses,
    yesterdaySittings,
  ] = await Promise.all([
    db.appointment.findMany({
      where: { clinicId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: 'asc' },
      include: { patient: true },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: monthStart } },
    }),
    db.patient.findMany({
      where: { clinicId },
      include: {
        visits: {
          include: {
            treatmentPlan: { include: { treatmentItems: true } }
          }
        }
      }
    }),
    db.treatmentItem.findMany({
      where: { consentStatus: 'SIGNED', treatmentPlan: { visit: { clinicId } } },
      include: {
        treatmentPlan: {
          include: {
            visit: { include: { patient: true } }
          }
        }
      }
    }),
    db.treatmentItem.findMany({
      where: { treatmentPlan: { visit: { clinicId } } },
    }),
    db.inventoryItem.findMany({
      where: { clinicId, stockQty: { lte: db.inventoryItem.fields.minStock } },
    }).catch(() => []),
    db.inventoryItem.findMany({
      where: {
        clinicId,
        expiryDate: { lte: new Date(now.getTime() + 30*24*60*60*1000), gte: now }
      }
    }).catch(() => []),
    db.feeEntry.findMany({
      where: { clinicId, status: 'PENDING' },
      include: { consultant: true },
    }),
    db.expense.findMany({
      where: { clinicId, date: { gte: monthStart } },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      orderBy: { date: 'asc' },
    }),
    db.expense.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      orderBy: { date: 'asc' },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: yesterday, lte: yesterdayEnd } },
      include: { patient: true },
    }),
  ])

  const monthRevenue = monthSittings.reduce((s, x) => s + Number(x.paid || 0), 0)
  const monthExpTotal = monthExpenses.reduce((s, x) => s + Number(x.amount || 0), 0)
  const totalBalance = allPatients.reduce((sum, p) => {
    const est = p.visits.flatMap(v => v.treatmentPlan?.treatmentItems || []).reduce((s, t) => s + Number(t.estimatedCost || 0), 0)
    return sum + est
  }, 0)

  const sittingsByPatient = {}
  const allSittings = await db.sitting.findMany({ where: { clinicId } })
  allSittings.forEach(s => {
    if (!sittingsByPatient[s.patientId]) sittingsByPatient[s.patientId] = []
    sittingsByPatient[s.patientId].push(s)
  })

  const overduePatients = []
  const seenPatientIds = new Set()
  activeTreatmentItems.forEach(item => {
    const patient = item.treatmentPlan?.visit?.patient
    if (!patient || seenPatientIds.has(patient.id)) return
    const patientSittings = sittingsByPatient[patient.id] || []
    const lastSitting = patientSittings.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    const lastDate = lastSitting ? new Date(lastSitting.date) : null
    const daysSince = lastDate ? Math.round((now - lastDate) / (1000*60*60*24)) : 999
    if (daysSince >= 30) {
      seenPatientIds.add(patient.id)
      overduePatients.push({
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile,
        treatment: item.procedureName,
        toothRef: item.toothRef,
        daysSince,
      })
    }
  })
  overduePatients.sort((a, b) => b.daysSince - a.daysSince)

  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'))
  }

  const revenueByMonth = {}
  const expByMonth = {}
  months.forEach(m => { revenueByMonth[m] = 0; expByMonth[m] = 0 })
  sixMonthSittings.forEach(s => {
    const m = new Date(s.date).toISOString().slice(0,7)
    if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(s.paid || 0)
  })
  sixMonthExpenses.forEach(e => {
    const m = new Date(e.date).toISOString().slice(0,7)
    if (expByMonth[m] !== undefined) expByMonth[m] += Number(e.amount || 0)
  })

  const treatmentCounts = {}
  allTreatmentItems.forEach(t => {
    const name = t.procedureName || 'Other'
    treatmentCounts[name] = (treatmentCounts[name] || 0) + 1
  })
  const topTreatments = Object.entries(treatmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const lowStockCount = await db.inventoryItem.count({
    where: { clinicId, stockQty: { lte: 0 } }
  }).catch(() => 0)

  const pendingFeeTotal = pendingFees.reduce((s, f) => s + Number(f.consultantShare || 0), 0)

  return (
    <DashboardView
      doctorName={doctor.name}
      clinicName={doctor.clinic?.name || 'Orakare Dental Clinic'}
      todayAppointments={todayAppointments}
      monthRevenue={monthRevenue}
      monthExpTotal={monthExpTotal}
      totalPatients={allPatients.length}
      activeTreatmentsCount={activeTreatmentItems.length}
      overdueCount={overduePatients.length}
      overduePatients={overduePatients.slice(0, 4)}
      balancePending={totalBalance}
      lowStockCount={lowStockCount}
      expiringCount={expiringItems.length}
      pendingFeeTotal={pendingFeeTotal}
      months={months}
      revenueByMonth={revenueByMonth}
      expByMonth={expByMonth}
      topTreatments={topTreatments}
      yesterdaySittings={yesterdaySittings}
    />
  )
}