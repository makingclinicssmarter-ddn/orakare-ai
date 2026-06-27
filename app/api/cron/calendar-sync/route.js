import { NextResponse } from 'next/server'
import { syncAllClinics } from '@/lib/appointment-sync'

/**
 * Vercel Cron endpoint. Configured in vercel.json to run every 10 minutes.
 *
 * Vercel Cron sends a request with an Authorization header containing the
 * CRON_SECRET env var (if set). For Push #12 we accept all requests since
 * the endpoint is non-destructive (read-only sync) and the cost is minimal.
 *
 * If you want to lock this down later, set CRON_SECRET in Vercel and
 * uncomment the check below.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // sync may take ~30s for 250 events

export async function GET(req) {
  // Optional auth check — uncomment after setting CRON_SECRET env var
  // const authHeader = req.headers.get('authorization') || ''
  // if (process.env.CRON_SECRET && authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }

  try {
    const results = await syncAllClinics()
    return NextResponse.json({ ok: true, results, syncedAt: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Sync failed' }, { status: 500 })
  }
}

// Also expose POST so manual triggers work the same way
export const POST = GET
