import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import DashboardView from '@/components/dashboard/DashboardView'
import { computePatientFinances } from '@/lib/finance'

export default async function DashboardPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
    include: { clinic: true }
  })

  if (!doctor) return null

  const clinicId = doctor.clinicId
  const now = new Date()
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1); yesterdayEnd.setHours(23, 59, 59, 999)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

  const [
    todayAppointments,
    monthSittings,
    totalPatientCount,
    activeTreatmentItems,
    allTreatmentItems,
    lowStockItems,
    expiringItems,
    pendingFees,
    monthExpenses,
    sixMonthSittings,
    sixMonthExpenses,
    yesterdaySittings,
    recentSittings,
    allPatientBalances,
  ] = await Promise.all([
    // Today's appointments
    db.appointment.findMany({
      where: { clinicId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: 'asc' },
      include: { patient: true },
    }),
    // This month's sittings for revenue
    db.sitting.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { paid: true },
    }),
    // Just a count — no joins needed
    db.patient.count({ where: { clinicId } }),
    // Active treatment items for overdue detection
    db.treatmentItem.findMany({
      where: { consentStatus: 'SIGNED', treatmentPlan: { visit: { clinicId } } },
      include: {
        treatmentPlan: {
          include: {
            visit: { include: { patient: { select: { id: true, name: true, mobile: true } } } }
          }
        }
      }
    }),
    // All treatment items for procedure breakdown
    db.treatmentItem.findMany({
      where: { treatmentPlan: { visit: { clinicId } } },
      select: { procedureName: true },
    }),
    // Low stock — count only
    db.inventoryItem.count({
      where: { clinicId, stockQty: { lte: 0 } },
    }).catch(() => 0),
    // Expiring items
    db.inventoryItem.findMany({
      where: {
        clinicId,
        expiryDate: {
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          gte: now,
        }
      },
      select: { id: true },
    }).catch(() => []),
    // Pending consultant fees
    db.feeEntry.findMany({
      where: { clinicId, status: 'PENDING' },
      include: { consultant: { select: { name: true } } },
    }),
    // This month's expenses
    db.expense.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { amount: true },
    }),
    // 6 months sittings for chart
    db.sitting.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { paid: true, date: true },
      orderBy: { date: 'asc' },
    }),
    // 6 months expenses for chart
    db.expense.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' },
    }),
    // Yesterday's sittings
    db.sitting.findMany({
      where: { clinicId, date: { gte: yesterday, lte: yesterdayEnd } },
      include: { patient: { select: { id: true, name: true } } },
    }),
    // Last 12 months sittings for overdue detection — limited window
    db.sitting.findMany({
      where: { clinicId, date: { gte: twelveMonthsAgo } },
      select: { patientId: true, paid: true, date: true },
    }),
    // Patient balances — fetch via the same data shape as the Records and
    // Balance pages so the totals agree. The finance helper splits payments
    // into treatment vs visit-charges streams.
    db.patient.findMany({
      where: { clinicId, archivedAt: null },
      select: {
        id: true,
        treatments: { select: { estimate: true, discount: true } },
        receipts: {
          select: {
            amount: true,
            invoiceId: true,
            allocations: { select: { id: true } },
          },
        },
        invoices: { select: { total: true, balance: true, kind: true } },
      },
    }),
  ])

  // Calculate revenue and expenses
  const monthRevenue = monthSittings.reduce((s, x) => s + Number(x.paid || 0), 0)
  const monthExpTotal = monthExpenses.reduce((s, x) => s + Number(x.amount || 0), 0)

  // Build paid-by-patient and sittings-by-patient from limited window
  const paidByPatient = {}
  const lastSittingByPatient = {}
  recentSittings.forEach(function(s) {
    paidByPatient[s.patientId] = (paidByPatient[s.patientId] || 0) + Number(s.paid || 0)
    const existing = lastSittingByPatient[s.patientId]
    if (!existing || new Date(s.date) > new Date(existing)) {
      lastSittingByPatient[s.patientId] = s.date
    }
  })

  // Total balance — sum of per-patient outstanding using the shared finance
  // helper. This matches the /dashboard/balance page totals and each patient's
  // Records page math (treatment balance + visit-charges balance).
  const totalBalance = allPatientBalances.reduce(function(sum, p) {
    const fin = computePatientFinances(p)
    return sum + fin.totalBalance
  }, 0)

  // Overdue patients — last sitting > 30 days ago
  const overduePatients = []
  const seenPatientIds = new Set()
  activeTreatmentItems.forEach(function(item) {
    const patient = item.treatmentPlan?.visit?.patient
    if (!patient || seenPatientIds.has(patient.id)) return
    const lastDate = lastSittingByPatient[patient.id]
    const daysSince = lastDate
      ? Math.round((now - new Date(lastDate)) / (1000 * 60 * 60 * 24))
      : 999
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

  // 6-month chart data
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
  }
  const revenueByMonth = {}
  const expByMonth = {}
  months.forEach(m => { revenueByMonth[m] = 0; expByMonth[m] = 0 })
  sixMonthSittings.forEach(s => {
    const m = new Date(s.date).toISOString().slice(0, 7)
    if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(s.paid || 0)
  })
  sixMonthExpenses.forEach(e => {
    const m = new Date(e.date).toISOString().slice(0, 7)
    if (expByMonth[m] !== undefined) expByMonth[m] += Number(e.amount || 0)
  })

  // Top treatments
  const treatmentCounts = {}
  allTreatmentItems.forEach(t => {
    const name = t.procedureName || 'Other'
    treatmentCounts[name] = (treatmentCounts[name] || 0) + 1
  })
  const topTreatments = Object.entries(treatmentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const pendingFeeTotal = pendingFees.reduce((s, f) => s + Number(f.consultantShare || 0), 0)

  return (
    <DashboardView
      doctorName={doctor.name}
      clinicName={doctor.clinic?.name || 'Orakare Dental Clinic'}
      todayAppointments={todayAppointments}
      monthRevenue={monthRevenue}
      monthExpTotal={monthExpTotal}
      totalPatients={totalPatientCount}
      activeTreatmentsCount={activeTreatmentItems.length}
      overdueCount={overduePatients.length}
      overduePatients={overduePatients.slice(0, 4)}
      balancePending={totalBalance}
      lowStockCount={lowStockItems}
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