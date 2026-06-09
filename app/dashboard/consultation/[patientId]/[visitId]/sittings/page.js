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
            treatmentItems: {
              where: { consentStatus: 'SIGNED' }
            }
          }
        }
      }
    }),
  ])

  if (!patient || !visit) notFound()

  // Get Treatment records created from consented TreatmentItems
  const treatmentItemIds = visit.treatmentPlan?.treatmentItems?.map(
    function(i) { return i.id }
  ) || []

  const [treatments, receipts] = await Promise.all([
    db.treatment.findMany({
      where: { treatmentItemId: { in: treatmentItemIds } },
      include: {
        sittings: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    }),
    db.receipt.findMany({
      where: { patientId },
      include: { allocations: true },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ])

  // Calculate wallet
  const totalEstimate = treatments.reduce(function(s, t) {
    return s + (t.estimate || 0)
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
        treatments={treatments}
        receipts={receipts}
        totalEstimate={totalEstimate}
        totalReceipts={totalReceipts}
        walletBalance={walletBalance}
      />
    </ConsultationLayout>
  )
}