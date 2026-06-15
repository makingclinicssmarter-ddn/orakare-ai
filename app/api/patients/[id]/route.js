import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// PATCH /api/patients/[id]
// Edit basic patient details. Push #4 first wave.
//
// Editable fields: name, mobile, age, gender, address, email
// NOT editable: originalID (ORK-ID), clinicId, createdAt, doctorId
// The constraint is the audit trail — these define identity, not just data.

const EDITABLE_FIELDS = ['name', 'mobile', 'age', 'gender', 'address', 'email']

export async function PATCH(req, props) {
  const params = await props.params
  const patientId = params.id

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })

  // Only accept editable fields
  const updates = {}
  EDITABLE_FIELDS.forEach(function(field) {
    if (body[field] !== undefined) {
      if (field === 'age') {
        const n = parseInt(body.age, 10)
        if (Number.isFinite(n) && n >= 0 && n <= 150) updates.age = n
      } else {
        const v = typeof body[field] === 'string' ? body[field].trim() : body[field]
        if (v !== null && v !== undefined) updates[field] = v
      }
    }
  })

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  // Verify the patient is in this clinic
  const existing = await db.patient.findFirst({
    where: { id: patientId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!existing) return notFoundResponse()

  // Validate name not empty
  if (updates.name !== undefined && !updates.name) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
  }
  // Validate mobile not empty
  if (updates.mobile !== undefined && !updates.mobile) {
    return NextResponse.json({ error: 'Mobile cannot be empty' }, { status: 400 })
  }

  await db.patient.update({
    where: { id: patientId },
    data: updates,
  })

  return NextResponse.json({ ok: true })
}
