import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Resolves the current Clerk user to a doctor + clinic context.
 * Returns { userId, doctorId, clinicId } — any may be null if not authenticated
 * or no doctor record exists for the given Clerk user.
 *
 * Push #2 will move clinicId/doctorId into Clerk session claims so this becomes
 * a zero-DB-hit lookup. For now, one indexed lookup on Doctor.clerkId (@unique).
 */
export async function getDoctorContext() {
  const { userId } = await auth()
  if (!userId) return { userId: null, doctorId: null, clinicId: null }

  const doctor = await db.doctor.findUnique({
    where: { clerkId: userId },
    select: { id: true, clinicId: true },
  })

  if (!doctor) {
    return { userId, doctorId: null, clinicId: null }
  }

  return { userId, doctorId: doctor.id, clinicId: doctor.clinicId }
}

/**
 * Verify a visit belongs to the doctor's clinic.
 * Returns minimal visit fields when authorized, null otherwise.
 */
export async function verifyVisitAccess(visitId, clinicId) {
  if (!visitId || !clinicId) return null
  return db.visit.findFirst({
    where: { id: visitId, clinicId },
    select: { id: true, patientId: true, clinicId: true, status: true, doctorId: true },
  })
}

/**
 * Verify a patient belongs to the doctor's clinic.
 * Returns minimal patient fields when authorized, null otherwise.
 */
export async function verifyPatientAccess(patientId, clinicId) {
  if (!patientId || !clinicId) return null
  return db.patient.findFirst({
    where: { id: patientId, clinicId },
    select: { id: true, clinicId: true },
  })
}

/**
 * Verify all given TreatmentItem ids belong to the doctor's clinic.
 * Returns the array of authorized items (may be partial — caller should
 * compare length against the requested ids to detect mixed-tenant requests).
 */
export async function verifyTreatmentItemsAccess(itemIds, clinicId) {
  if (!Array.isArray(itemIds) || itemIds.length === 0 || !clinicId) return []
  return db.treatmentItem.findMany({
    where: {
      id: { in: itemIds },
      treatmentPlan: { visit: { clinicId } },
    },
    select: { id: true },
  })
}

// ── Standard error responses ────────────────────────────────────────────────

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(reason = 'Forbidden') {
  return NextResponse.json({ error: reason }, { status: 403 })
}

export function notFoundResponse(reason = 'Not found') {
  return NextResponse.json({ error: reason }, { status: 404 })
}
