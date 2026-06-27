import { NextResponse } from 'next/server'
import { syncCalendarForClinic } from '@/lib/appointment-sync'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

/**
 * Manual sync trigger. Called from the "Sync now" button on the
 * /dashboard/appointments page.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  try {
    const summary = await syncCalendarForClinic(ctx.clinicId)
    return NextResponse.json({ ok: true, summary, syncedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Sync failed' }, { status: 500 })
  }
}
