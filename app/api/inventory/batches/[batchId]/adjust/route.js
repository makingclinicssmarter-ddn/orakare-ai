import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// POST /api/inventory/batches/[batchId]/adjust
// Body: { action: 'expire' | 'damage' | 'correct', quantity?, reason? }
//
// Marks a batch as expired or damaged (sets quantity to 0, updates status).
// Or corrects the quantity (e.g. "actual count is 8, not 10" — physical
// recount). Correction sets quantity to the supplied value.

export async function POST(req, props) {
  const params = await props.params
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const body = await req.json().catch(function() { return {} })
  const action = body.action

  const batch = await db.inventoryBatch.findFirst({
    where: { id: params.batchId, clinicId: ctx.clinicId },
    select: { id: true, quantity: true, status: true, notes: true },
  })
  if (!batch) return notFoundResponse()

  const stamp = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
  const reason = (body.reason || '').toString().trim()

  if (action === 'expire') {
    const note = '[Expired ' + stamp + ']' + (reason ? ' ' + reason : '')
    const newNotes = batch.notes ? batch.notes + '\n' + note : note
    await db.inventoryBatch.update({
      where: { id: batch.id },
      data: { quantity: 0, status: 'EXPIRED', notes: newNotes },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'damage') {
    const note = '[Damaged ' + stamp + ']' + (reason ? ' ' + reason : '')
    const newNotes = batch.notes ? batch.notes + '\n' + note : note
    await db.inventoryBatch.update({
      where: { id: batch.id },
      data: { quantity: 0, status: 'DAMAGED', notes: newNotes },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'correct') {
    const qty = parseInt(body.quantity, 10)
    if (!Number.isFinite(qty) || qty < 0) {
      return NextResponse.json({ error: 'Quantity must be 0 or positive integer' }, { status: 400 })
    }
    const note = '[Corrected ' + stamp + ': ' + batch.quantity + ' → ' + qty + ']' + (reason ? ' ' + reason : '')
    const newNotes = batch.notes ? batch.notes + '\n' + note : note
    const newStatus = qty === 0 ? 'DEPLETED' : 'ACTIVE'
    await db.inventoryBatch.update({
      where: { id: batch.id },
      data: { quantity: qty, status: newStatus, notes: newNotes },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action — must be expire, damage, or correct' }, { status: 400 })
}
