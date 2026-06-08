import { NextResponse } from 'next/server'
import { warmup } from '@/lib/db'

export async function GET() {
  await warmup()
  return NextResponse.json({ ok: true })
}