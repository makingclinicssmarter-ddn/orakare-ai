import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import ConsultationLayout from '@/components/consultation/ConsultationLayout'
import VisitSummary from '@/components/consultation/VisitSummary'

export default async function SummaryPage(props) {
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
        address: true,
        dentalHistory: true,
        personalHistory: true,
      }
    }),
    db.visit.findUnique({
      where: { id: visitId },
      include: {
        medicalHistory: true,
        clinicalFindings: true,
        treatmentPlan: {
          include: {
            treatmentItems: {
              include: {
                sittings: {
                  orderBy: { date: 'asc' }
                }
              }
            }
          }
        }
      }
    }),
  ])

  if (!patient || !visit) notFound()

  // Get receipts for this patient
  const receipts = await db.receipt.findMany({
    where: { patientId },
    orderBy: { date: 'desc' },
    take: 50,
  })

  const totalEstimate = visit.treatmentPlan?.treatmentItems?.reduce(function(s, i) {
    return s + (i.estimatedCost || 0)
  }, 0) || 0

  const totalCollected = receipts.reduce(function(s, r) {
    return s + (r.amount || 0)
  }, 0)

  return (
    <ConsultationLayout
      patient={patient}
      visit={visit}
      visitId={visitId}
      patientId={patientId}
      activeStep={5}
    >
      <VisitSummary
        patient={patient}
        visit={visit}
        visitId={visitId}
        patientId={patientId}
        receipts={receipts}
        totalEstimate={totalEstimate}
        totalCollected={totalCollected}
      />
    </ConsultationLayout>
  )
}