import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'

// Push #10: Smart entry route for starting/resuming a consultation.
//
// /dashboard/consultation/<patientId>  →  redirects to either:
//   - the resume screen of an in-progress visit, OR
//   - the start screen of a newly-created visit
//
// This is what the various "Start consultation" buttons across the app expect.

function getResumeScreen(status) {
  switch (status) {
    case 'REGISTERED': return 'start'
    case 'HISTORY_TAKEN': return 'examination'
    case 'EXAM_CONSENT_SIGNED': return 'examination'
    case 'EXAMINATION_DONE': return 'treatment'
    case 'TREATMENT_PLANNED': return 'consent'
    case 'TREATMENT_CONSENT_SIGNED': return 'sittings'
    default: return 'start'
  }
}

export default async function ConsultationEntryPage(props) {
  const params = await props.params
  const patientId = params.patientId

  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const doctor = await db.doctor.findFirst({ where: { clerkId: userId } })
  if (!doctor) redirect('/onboarding')

  // Confirm patient exists in this clinic
  const patient = await db.patient.findFirst({
    where: { id: patientId, clinicId: doctor.clinicId },
    select: { id: true },
  })
  if (!patient) notFound()

  // Try to resume an incomplete visit first
  const incompleteVisit = await db.visit.findFirst({
    where: {
      patientId,
      clinicId: doctor.clinicId,
      status: { notIn: ['COMPLETED', 'TREATED_COMPLETE', 'ADVISED_COMPLETE', 'CONSENTED_COMPLETE'] },
    },
    include: {
      treatmentPlan: {
        include: { treatmentItems: { select: { consentStatus: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (incompleteVisit) {
    const hasConsentedItems = incompleteVisit.treatmentPlan?.treatmentItems?.some(
      function(item) { return item.consentStatus === 'SIGNED' }
    )
    const goTo = hasConsentedItems ? 'sittings' : getResumeScreen(incompleteVisit.status)
    redirect('/dashboard/consultation/' + patientId + '/' + incompleteVisit.id + '/' + goTo)
  }

  // No incomplete visit — create one and redirect to start
  const visit = await db.visit.create({
    data: {
      patientId,
      clinicId: doctor.clinicId,
      doctorId: doctor.id,
      status: 'REGISTERED',
    },
  })
  redirect('/dashboard/consultation/' + patientId + '/' + visit.id + '/start')
}
