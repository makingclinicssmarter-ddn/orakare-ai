import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// GET /api/visits/[visitId]
// Returns the full visit graph needed by:
//   - The Close-visit screen (pre-fill charges/advice/next-appointment)
//   - The force-resolve banner (status check)
//   - The prescription slip route (clinical content)
// Clinic-scoped via the doctor context.
export async function GET(req, props) {
  const params = await props.params
  const visitId = params.visitId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const visit = await db.visit.findFirst({
    where: { id: visitId, clinicId: ctx.clinicId },
    include: {
      patient: {
        select: {
          id: true, name: true, age: true, gender: true,
          mobile: true, originalID: true, abhaId: true, address: true,
        },
      },
      doctor: { select: { id: true, name: true, qualification: true } },
      clinic: { select: { id: true, name: true, address: true, phone: true, regNo: true, charges: true } },
      medicalHistory: true,
      clinicalFindings: true,
      diagnosis: true,
      treatmentPlan: {
        include: {
          treatmentItems: {
            include: { treatment: true },
          },
        },
      },
    },
  })

  if (!visit) return notFoundResponse()

  return NextResponse.json({ visit })
}
