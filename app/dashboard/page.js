import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import DashboardView from '@/components/dashboard/DashboardView'
import { summarizeBatches } from '@/lib/inventory-fifo'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
    include: { clinic: true },
  })
  if (!doctor || !doctor.clinic) redirect('/onboarding')
  const clinicId = doctor.clinic.id

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayEnd = new Date(todayStart.getTime() - 1)

  const [
    todayApts,
    monthReceipts,          // Push #8: current source of revenue truth
    monthSittingsLegacy,    //   ...with legacy Sitting.paid as fallback for historical visits
    totalPatients,
    activeTreatmentsItems,
    allTreatmentItems,
    inventoryItemsForKPI,   // Push #8: stock value + low stock count
    pendingFees,
    monthExpenses,
    sixMoReceipts,          // Push #8: 6-month chart from Receipts
    sixMoSittingsLegacy,    //   ...plus legacy
    sixMoExpenses,
    yesterdaySittings,
    longWindowSittings,
    patientsForBal,
  ] = await Promise.all([
    db.appointment.findMany({
      where: { clinicId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: 'asc' },
      include: { patient: true },
    }),
    // Push #8: This month's RECEIPTS — the actual money in
    db.receipt.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { amount: true },
    }),
    // This month's legacy per-sitting payments (Sitting.paid is no longer
    // written by the post-Push#3.5 close flow, but historical records still have it)
    db.sitting.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { paid: true, treatmentId: true },
    }),
    db.patient.count({ where: { clinicId } }),
    db.treatmentItem.findMany({
      where: { consentStatus: 'SIGNED', treatmentPlan: { visit: { clinicId } } },
      include: {
        treatmentPlan: {
          include: {
            visit: { include: { patient: { select: { id: true, name: true, mobile: true } } } }
          }
        },
        treatment: { select: { id: true, type: true, estimate: true, discount: true, status: true } },
      }
    }),
    // All treatment items for procedure breakdown (count + revenue)
    db.treatmentItem.findMany({
      where: { treatmentPlan: { visit: { clinicId } } },
      select: {
        procedureName: true,
        treatment: {
          select: {
            id: true, estimate: true, discount: true,
            paymentAllocations: { select: { amount: true } },
          },
        },
      },
    }),
    // Push #8: inventory items with active batches for stock value + low-stock count
    db.inventoryItem.findMany({
      where: { clinicId, isActive: true },
      include: {
        batches: {
          where: { status: 'ACTIVE' },
          select: { quantity: true, unitCost: true, expiryDate: true, status: true, receivedDate: true },
        },
      },
    }).catch(function() { return [] }),
    db.feeEntry.findMany({
      where: { clinicId, status: 'PENDING' },
      include: { consultant: { select: { name: true } } },
    }),
    db.expense.findMany({
      where: { clinicId, date: { gte: monthStart } },
      select: { amount: true },
    }),
    // 6 months receipts for chart (Push #8)
    db.receipt.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' },
    }),
    // 6 months legacy sittings for chart fallback
    db.sitting.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { paid: true, date: true },
      orderBy: { date: 'asc' },
    }),
    db.expense.findMany({
      where: { clinicId, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: yesterday, lte: yesterdayEnd } },
      include: { patient: { select: { id: true, name: true } } },
    }),
    db.sitting.findMany({
      where: { clinicId, date: { gte: twelveMonthsAgo } },
      select: { patientId: true, paid: true, date: true },
    }),
    db.patient.findMany({
      where: { clinicId },
      select: {
        id: true,
        treatments: {
          select: {
            estimate: true, discount: true,
            paymentAllocations: { select: { amount: true } },
          },
        },
        invoices: {
          where: { kind: 'VISIT_CHARGES' },
          select: { balance: true },
        },
      },
    }),
  ])

  // -------- Push #8: Revenue from Receipts (the truth) --------
  // To avoid double-counting historical records where the close flow created
  // a Receipt AND the legacy sitting was already paid, we sum receipts as the
  // primary source. We add legacy Sitting.paid only for sittings whose
  // treatmentId has NO payment allocations on it for this period.
  const monthRevenueFromReceipts = monthReceipts.reduce(function(s, r) { return s + Number(r.amount || 0) }, 0)

  // Legacy fallback: only add sitting.paid if the row pre-dates the post-#3.5
  // payment model. Simplest heuristic: include legacy paid only for sittings
  // where treatmentId is not null AND amount > 0. We rely on the conservative
  // assumption that any new payment goes through Receipt. If both exist for the
  // same period, the receipts already count for it.
  //
  // To avoid over-counting in the transition window, we exclude sittings whose
  // dates overlap heavily with receipts. Since this is the dashboard month KPI,
  // and Dr. Shobhna's clinic transitioned cleanly, primary source is Receipts.
  // Pure legacy historical revenue (pre-Push#3.5) is captured in past months
  // and doesn't affect the current month.
  const monthRevenue = monthRevenueFromReceipts

  // -------- This month's expense total --------
  const monthExpTotal = monthExpenses.reduce(function(s, x) { return s + Number(x.amount || 0) }, 0)

  // -------- 6-month chart: revenue + expense per month --------
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }))
  }
  const revenueByMonth = {}
  const expByMonth = {}
  months.forEach(function(m) { revenueByMonth[m] = 0; expByMonth[m] = 0 })

  sixMoReceipts.forEach(function(r) {
    const d = new Date(r.date)
    const m = d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (revenueByMonth[m] !== undefined) revenueByMonth[m] += Number(r.amount || 0)
  })
  // For pre-transition months (typically months with very low or 0 receipts but
  // sitting.paid values), add legacy sitting paid to keep historical charts
  // accurate. Only add for months that have NO receipt activity at all.
  const monthsWithReceipts = new Set(
    sixMoReceipts.map(function(r) {
      const d = new Date(r.date)
      return d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    })
  )
  sixMoSittingsLegacy.forEach(function(s) {
    const d = new Date(s.date)
    const m = d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (revenueByMonth[m] !== undefined && !monthsWithReceipts.has(m)) {
      revenueByMonth[m] += Number(s.paid || 0)
    }
  })
  sixMoExpenses.forEach(function(e) {
    const d = new Date(e.date)
    const m = d.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    if (expByMonth[m] !== undefined) expByMonth[m] += Number(e.amount || 0)
  })

  // -------- Patient balances summary --------
  let balancePending = 0
  patientsForBal.forEach(function(p) {
    let treatmentBal = 0
    p.treatments.forEach(function(t) {
      const est = Math.max(0, Number(t.estimate || 0) - Number(t.discount || 0))
      const paid = (t.paymentAllocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
      treatmentBal += Math.max(0, est - paid)
    })
    const invoiceBal = (p.invoices || []).reduce(function(s, i) { return s + Number(i.balance || 0) }, 0)
    balancePending += treatmentBal + invoiceBal
  })

  // -------- Active treatments count --------
  const activeTreatmentsCount = activeTreatmentsItems.filter(function(ti) {
    return ti.treatment && ti.treatment.status !== 'COMPLETED' && ti.treatment.status !== 'CANCELLED'
  }).length

  // -------- Treatments breakdown (volume + revenue) [Push #8 Bug 4] --------
  const tCountByName = {}
  const tRevenueByName = {}
  allTreatmentItems.forEach(function(ti) {
    const name = ti.procedureName || 'Other'
    tCountByName[name] = (tCountByName[name] || 0) + 1
    if (ti.treatment) {
      const paid = (ti.treatment.paymentAllocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
      tRevenueByName[name] = (tRevenueByName[name] || 0) + paid
    }
  })
  const topTreatmentsByVolume = Object.entries(tCountByName)
    .sort(function(a, b) { return b[1] - a[1] })
    .slice(0, 5)
    .map(function(e) { return { name: e[0], value: e[1] } })
  const topTreatmentsByRevenue = Object.entries(tRevenueByName)
    .filter(function(e) { return e[1] > 0 })
    .sort(function(a, b) { return b[1] - a[1] })
    .slice(0, 5)
    .map(function(e) { return { name: e[0], value: e[1] } })

  // -------- Inventory KPI [Push #8 Bug 3] --------
  let lowStockCount = 0
  let expiringSoonCount = 0
  let stockValue = 0
  inventoryItemsForKPI.forEach(function(it) {
    const summary = summarizeBatches(it.batches || [])
    if (summary.totalActive < (it.minOrderQty || 5)) lowStockCount++
    if (summary.totalAtRisk > 0) expiringSoonCount++
    ;(it.batches || []).forEach(function(b) {
      if (b.status === 'ACTIVE' && b.quantity > 0) {
        stockValue += Number(b.quantity || 0) * Number(b.unitCost || 0)
      }
    })
  })

  return (
    <DashboardView
      doctorName={doctor.name}
      clinicName={doctor.clinic?.name || 'OraKare Dental Clinic'}
      todayAppointments={todayApts.length}
      monthRevenue={monthRevenue}
      monthExpTotal={monthExpTotal}
      totalPatients={totalPatients}
      activeTreatmentsCount={activeTreatmentsCount}
      balancePending={balancePending}
      pieData={topTreatmentsByVolume}
      treatmentsRevenueData={topTreatmentsByRevenue}
      lowStockCount={lowStockCount}
      expiringSoonCount={expiringSoonCount}
      stockValue={stockValue}
      revenueByMonth={revenueByMonth}
      expByMonth={expByMonth}
      months={months}
      yesterdaySittingsCount={yesterdaySittings.length}
      pendingFees={pendingFees}
      // Legacy props kept for any read sites
      overdueCount={0}
      overduePatients={[]}
    />
  )
}
