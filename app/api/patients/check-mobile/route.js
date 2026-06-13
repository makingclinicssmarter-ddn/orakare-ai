import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

// GET /api/patients/check-mobile?mobile=9876543210
// Returns { exists: false } OR { exists: true, patient: {...} } if a patient
// (active or archived) with this mobile already exists in the clinic.
// Used by the registration UI to show a duplicate warning before submit.
export async function GET(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const { searchParams } = new URL(req.url)
  const mobile = (searchParams.get('mobile') || '').trim()
  if (!mobile || mobile.length < 6) {
    return NextResponse.json({ exists: false })
  }

  // Find ALL matches (active + archived), pick the most-recently-updated first
  // so the warning shows the most relevant record.
  const patient = await db.patient.findFirst({
    where: { clinicId: ctx.clinicId, mobile },
    orderBy: [{ archivedAt: 'asc' }, { updatedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      originalID: true,
      age: true,
      gender: true,
      mobile: true,
      archivedAt: true,
      createdAt: true,
    },
  })

  if (!patient) return NextResponse.json({ exists: false })
  return NextResponse.json({ exists: true, patient })
}
