import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

// GET /api/consultants?q=&showInactive=
// POST /api/consultants

export async function GET(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const showInactive = searchParams.get('showInactive') === 'true'

  const where = { clinicId: ctx.clinicId }
  if (!showInactive) where.active = true
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { specialization: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
    ]
  }

  const consultants = await db.consultant.findMany({
    where,
    include: {
      feeEntries: {
        where: { status: 'PENDING' },
        select: { consultantShare: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = consultants.map(function(c) {
    const pendingTotal = (c.feeEntries || []).reduce(function(s, f) { return s + Number(f.consultantShare || 0) }, 0)
    return {
      id: c.id,
      name: c.name,
      specialization: c.specialization,
      phone: c.phone,
      email: c.email,
      splitType: c.splitType,
      splitValue: c.splitValue,
      active: c.active,
      pendingPayoutTotal: pendingTotal,
      pendingFeeCount: (c.feeEntries || []).length,
    }
  })

  return NextResponse.json({ consultants: rows })
}

export async function POST(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const splitType = body.splitType === 'PERCENTAGE' || body.splitType === 'FIXED' ? body.splitType : null
  const splitValue = Number.isFinite(Number(body.splitValue)) ? Number(body.splitValue) : null

  if (splitType === 'PERCENTAGE' && (splitValue === null || splitValue < 0 || splitValue > 100)) {
    return NextResponse.json({ error: 'Percentage must be 0-100' }, { status: 400 })
  }
  if (splitType === 'FIXED' && (splitValue === null || splitValue < 0)) {
    return NextResponse.json({ error: 'Fixed amount must be 0 or higher' }, { status: 400 })
  }

  const created = await db.consultant.create({
    data: {
      clinicId: ctx.clinicId,
      name,
      specialization: body.specialization || null,
      phone: body.phone || null,
      email: body.email || null,
      splitType,
      splitValue,
      notes: body.notes || null,
      active: true,
    },
  })

  return NextResponse.json({ ok: true, consultant: created })
}
