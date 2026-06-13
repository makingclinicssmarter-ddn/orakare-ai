import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

// GET  /api/clinics/[clinicId]/charges  → { charges: [...] }
// PUT  /api/clinics/[clinicId]/charges  body: { charges: [...] } → { charges: [...] }
//
// `charges` is a JSON array of objects:
//   { id: string, label: string, category: string, amount: number, active: boolean }
// Each clinic owns its own list. Stored as Clinic.charges (Json).
//
// The whole list is replaced on PUT — simpler than per-item CRUD given the
// modest size (~30 entries typical). Client sends the full updated array.

function verifyClinic(clinicId, ctxClinicId) {
  return clinicId === ctxClinicId
}

export async function GET(_req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()
  if (!verifyClinic(params.clinicId, ctx.clinicId)) return forbidden()

  const clinic = await db.clinic.findUnique({
    where: { id: ctx.clinicId },
    select: { charges: true },
  })
  return NextResponse.json({ charges: clinic?.charges || [] })
}

export async function PUT(req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()
  if (!verifyClinic(params.clinicId, ctx.clinicId)) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const incoming = Array.isArray(body.charges) ? body.charges : []

  // Validate + normalize each entry. Invalid rows are silently dropped.
  const cleaned = incoming
    .filter(function(c) { return c && typeof c.label === 'string' && c.label.trim() })
    .map(function(c) {
      return {
        id: typeof c.id === 'string' && c.id ? c.id : ('chg_' + Math.random().toString(36).slice(2, 10)),
        label: c.label.trim(),
        category: typeof c.category === 'string' ? c.category : 'OTHER',
        amount: Number.isFinite(Number(c.amount)) ? Number(c.amount) : 0,
        active: c.active === false ? false : true,
      }
    })

  const updated = await db.clinic.update({
    where: { id: ctx.clinicId },
    data: { charges: cleaned },
    select: { charges: true },
  })

  return NextResponse.json({ charges: updated.charges })
}
