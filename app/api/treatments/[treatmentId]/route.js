import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// GET /api/treatments/[treatmentId]
// Returns the full treatment graph for the detail page: header info,
// sittings list, allocations + receipt info for paid-so-far.

export async function GET(_req, props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const t = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId },
    include: {
      patient: { select: { id: true, name: true, mobile: true, age: true, gender: true, originalID: true } },
      consultant: { select: { id: true, name: true } },
      treatmentItem: {
        include: {
          sittings: {
            orderBy: { date: 'desc' },
          },
        },
      },
      allocations: {
        orderBy: { createdAt: 'desc' },
        include: { receipt: { select: { id: true, date: true, paymentMode: true } } },
      },
    },
  })
  if (!t) return notFoundResponse()

  return NextResponse.json({ treatment: t })
}

// PATCH /api/treatments/[treatmentId]
// Edit treatment fields. Push #6: estimate is editable.
// Balance recomputes automatically from estimate − discount − allocations
// (we don't store balance; it's derived).

// Push #9: extended to accept consultant assignment (consultantId, splitType, splitValue).
// consultantId of '' (empty string) or null detaches the consultant.

const EDITABLE_FIELDS = ['estimate', 'discount']

export async function PATCH(req, props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })

  const existing = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!existing) return notFoundResponse()

  const updates = {}
  EDITABLE_FIELDS.forEach(function(field) {
    if (body[field] !== undefined) {
      const n = Number(body[field])
      if (Number.isFinite(n) && n >= 0) updates[field] = n
    }
  })

  // Push #9: consultant assignment
  if (body.consultantId !== undefined) {
    if (body.consultantId === null || body.consultantId === '') {
      // Detach consultant
      updates.consultantId = null
      updates.splitType = null
      updates.splitValue = null
    } else {
      // Verify consultant belongs to this clinic before attaching
      const consultant = await db.consultant.findFirst({
        where: { id: body.consultantId, clinicId: ctx.clinicId },
        select: { id: true },
      })
      if (!consultant) {
        return NextResponse.json({ error: 'Consultant not found' }, { status: 400 })
      }
      updates.consultantId = body.consultantId
      if (body.splitType === 'PERCENTAGE' || body.splitType === 'FIXED') {
        updates.splitType = body.splitType
      }
      if (body.splitValue !== undefined) {
        const sv = Number(body.splitValue)
        if (Number.isFinite(sv) && sv >= 0) updates.splitValue = sv
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  await db.treatment.update({
    where: { id: treatmentId },
    data: updates,
  })

  return NextResponse.json({ ok: true })
}
