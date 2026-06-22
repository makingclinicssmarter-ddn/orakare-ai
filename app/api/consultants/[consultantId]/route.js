import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

export async function GET(_req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const consultant = await db.consultant.findFirst({
    where: { id: params.consultantId, clinicId: ctx.clinicId },
    include: {
      feeEntries: {
        orderBy: { createdAt: 'desc' },
        include: {
          treatment: { select: { id: true, type: true, area: true, patient: { select: { id: true, name: true, originalID: true } } } },
        },
      },
    },
  })
  if (!consultant) return notFoundResponse()

  const pending = consultant.feeEntries.filter(function(f) { return f.status === 'PENDING' })
  const paid = consultant.feeEntries.filter(function(f) { return f.status === 'PAID' })
  const pendingTotal = pending.reduce(function(s, f) { return s + Number(f.consultantShare || 0) }, 0)
  const paidTotal = paid.reduce(function(s, f) { return s + Number(f.consultantShare || 0) }, 0)
  const lifetimeTotal = pendingTotal + paidTotal

  return NextResponse.json({
    consultant,
    summary: { pendingTotal, paidTotal, lifetimeTotal, pendingCount: pending.length, paidCount: paid.length },
  })
}

export async function PATCH(req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const existing = await db.consultant.findFirst({
    where: { id: params.consultantId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!existing) return notFoundResponse()

  const data = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (body.specialization !== undefined) data.specialization = body.specialization || null
  if (body.phone !== undefined) data.phone = body.phone || null
  if (body.email !== undefined) data.email = body.email || null
  if (body.splitType !== undefined) {
    const t = body.splitType
    data.splitType = (t === 'PERCENTAGE' || t === 'FIXED') ? t : null
  }
  if (body.splitValue !== undefined) {
    const n = Number(body.splitValue)
    data.splitValue = Number.isFinite(n) ? n : null
  }
  if (body.notes !== undefined) data.notes = body.notes || null
  if (typeof body.active === 'boolean') data.active = body.active

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  await db.consultant.update({ where: { id: params.consultantId }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req, props) {
  // Soft-delete only
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const existing = await db.consultant.findFirst({
    where: { id: params.consultantId, clinicId: ctx.clinicId },
    select: { id: true },
  })
  if (!existing) return notFoundResponse()

  await db.consultant.update({ where: { id: params.consultantId }, data: { active: false } })
  return NextResponse.json({ ok: true })
}
