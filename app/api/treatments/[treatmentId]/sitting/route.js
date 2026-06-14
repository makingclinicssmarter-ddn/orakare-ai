import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/treatments/[treatmentId]/sitting
// Body: { date, description, notes }
//
// Creates a new Visit + Sitting for an existing Treatment.
// Push #3.5 Zip 2.1 fix: if the Treatment has no TreatmentItem (e.g. imported
// historical treatments, or some legacy creation path), auto-bootstrap a
// TreatmentPlan + TreatmentItem so the Sitting can attach.

export async function POST(req, props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const dateStr = typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10)
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

  if (!description) {
    return NextResponse.json({ error: 'Description (work done) is required' }, { status: 400 })
  }

  const treatment = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
    select: {
      id: true, patientId: true, status: true, treatmentItemId: true,
      type: true, area: true, estimate: true,
    },
  })
  if (!treatment) return notFoundResponse()

  const doctor = await db.doctor.findFirst({
    where: { clinicId: ctx.clinicId, clerkId: ctx.userId },
    select: { id: true },
  })
  if (!doctor) return NextResponse.json({ error: 'Doctor profile not found' }, { status: 403 })

  const sittingDate = new Date(dateStr + 'T00:00:00+05:30')

  try {
    const result = await db.$transaction(async function(tx) {
      // 1. Create the new sitting-only visit
      const visit = await tx.visit.create({
        data: {
          patientId: treatment.patientId,
          clinicId: ctx.clinicId,
          doctorId: doctor.id,
          status: 'TREATMENT_CONSENT_SIGNED',
          needsResolution: true,
        },
      })

      // 2. Ensure the treatment has a TreatmentItem to hang the Sitting from.
      //    If missing (legacy/imported treatments), bootstrap one + a
      //    placeholder TreatmentPlan attached to THIS new visit.
      let treatmentItemId = treatment.treatmentItemId

      if (!treatmentItemId) {
        // Create a TreatmentPlan linked to the new visit
        const plan = await tx.treatmentPlan.create({
          data: {
            visitId: visit.id,
            approvedBy: doctor.id,
            approvedAt: new Date(),
          },
        })

        // Create a TreatmentItem mirroring the Treatment's identity
        const item = await tx.treatmentItem.create({
          data: {
            treatmentPlanId: plan.id,
            procedureName: treatment.type,
            toothRef: treatment.area || null,
            estimatedCost: treatment.estimate,
            consentStatus: 'SIGNED',  // implicit — they're already consented (treatment exists)
            consentSignedAt: new Date(),
          },
        })

        // Link Treatment back to the new TreatmentItem
        await tx.treatment.update({
          where: { id: treatment.id },
          data: { treatmentItemId: item.id },
        })

        treatmentItemId = item.id
      }

      // 3. The Sitting
      const sitting = await tx.sitting.create({
        data: {
          clinicId: ctx.clinicId,
          treatmentId: treatmentItemId,
          patientId: treatment.patientId,
          date: sittingDate,
          description: description,
          notes: notes || null,
          paid: 0,
          payMode: null,
          done: true,
        },
      })

      return { visitId: visit.id, sittingId: sitting.id }
    }, { maxWait: 10000, timeout: 30000 })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Return-for-sitting failed:', err)
    return NextResponse.json({ error: 'Failed to record sitting', detail: String(err.message || err) }, { status: 500 })
  }
}
