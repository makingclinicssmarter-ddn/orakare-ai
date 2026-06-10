import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import SittingsScreen from '@/components/consultation/SittingsScreen'

export default async function SittingsPage(props) {
  const params = await props.params
  const { patientId, visitId } = params

  const { clinicId } = await getDoctorContext()
  if (!clinicId) redirect('/sign-in')

  const [patient, visit] = await Promise.all([
    db.patient.findFirst({
      where: { id: patientId, clinicId },
      select: {
        id: true, name: true, age: true, gender: true, mobile: true,
        originalID: true, dentalHistory: true, personalHistory: true,
      },
    }),
    db.visit.findFirst({
      where: { id: visitId, clinicId },
      include: {
        medicalHistory: true,
        treatmentPlan: {
          include: { treatmentItems: true },
        },
      },
    }),
  ])

  if (!patient || !visit) notFound()

  // Only consented TreatmentItems are eligible for sittings
  const consentedItems = visit.treatmentPlan?.treatmentItems?.filter(
    function(i) { return i.consentStatus === 'SIGNED' }
  ) || []
  const consentedItemIds = consentedItems.map(function(i) { return i.id })

  // Fetch sittings + receipts (clinic-scoped — receipts already have clinicId)
  const [sittings, receipts] = await Promise.all([
    consentedItemIds.length > 0
      ? db.sitting.findMany({
          where: { treatmentId: { in: consentedItemIds }, clinicId },
          orderBy: { date: 'desc' },
        })
      : Promise.resolve([]),
    db.receipt.findMany({
      where: { patientId, clinicId },
      include: { allocations: true },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ])

  // Attach sittings to their TreatmentItem for the screen
  const itemsWithSittings = consentedItems.map(function(item) {
    return {
      ...item,
      sittings: sittings.filter(function(s) { return s.treatmentId === item.id }),
    }
  })

  // Wallet calculations — defensive defaults so undefined never reaches the UI
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
        visit={visit}
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
