import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import SittingsScreen from '@/components/consultation/SittingsScreen'

export default async function SittingsPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const [{ userId }, patient, visit] = await Promise.all([
    auth(),
    db.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        mobile: true,
        originalID: true,
        dentalHistory: true,
        personalHistory: true,
      }
    }),
    db.visit.findUnique({
      where: { id: visitId },
      include: {
        medicalHistory: true,
        treatmentPlan: {
          include: {
            treatmentItems: true
          }
        }
      }
    }),
  ])

  if (!patient || !visit) notFound()

  // Only consented TreatmentItems
  const consentedItems = visit.treatmentPlan?.treatmentItems?.filter(
    function(i) { return i.consentStatus === 'SIGNED' }
  ) || []

  const consentedItemIds = consentedItems.map(function(i) { return i.id })

  // Fetch sittings and receipts in parallel
  const [sittings, receipts] = await Promise.all([
    db.sitting.findMany({
      where: { treatmentId: { in: consentedItemIds } },
      orderBy: { date: 'desc' }
    }),
    db.receipt.findMany({
      where: { patientId },
      include: { allocations: true },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ])

  // Attach sittings to their TreatmentItem
  const itemsWithSittings = consentedItems.map(function(item) {
    return {
      ...item,
      sittings: sittings.filter(function(s) {
        return s.treatmentId === item.id
      })
    }
  })

  // Wallet calculations
  const totalEstimate = consentedItems.reduce(function(s, i) {
    return s + (i.estimatedCost || 0)
  }, 0)
  const totalReceipts = receipts.reduce(function(s, r) {
    return s + (r.amount || 0)
  }, 0)
  const totalAllocated = receipts.reduce(function(s, r) {
    return s + r.allocations.reduce(function(a, al) {
      return a + (al.amount || 0)
    }, 0)
  }, 0)
  const walletBalance = totalReceipts - totalAllocated

  return (
    <ConsultationLayout
      patient={patient}
      visit={visit}
      visitId={visitId}
      patientId={patientId}
      activeStep={5}
    >
      <SittingsScreen
        patient={patient}
        visitId={visitId}
        patientId={patientId}
        items={itemsWithSittings}
        receipts={receipts}
        totalEstimate={totalEstimate}
        totalReceipts={totalReceipts}
        walletBalance={walletBalance}
      />
    </ConsultationLayout>
  )
}