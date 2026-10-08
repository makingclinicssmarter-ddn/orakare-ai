import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized } from '@/lib/auth-helpers'

const MAX_SIZE_BYTES = 300 * 1024 // 300 KB — enough for any clinic logo

/**
 * POST /api/settings/logo
 * Accepts a multipart form with field "logo" (image file).
 * Converts to base64 data URL and stores on Clinic.logoUrl.
 *
 * DELETE /api/settings/logo
 * Clears the stored logo.
 */

export async function POST(request) {
  const { clinicId } = await getDoctorContext()
  if (!clinicId) return unauthorized()

  const formData = await request.formData()
  const file = formData.get('logo')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image (PNG, JPG, SVG, WebP)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.byteLength > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Image too large. Please use a file under 300 KB.' }, { status: 400 })
  }

  const base64 = buffer.toString('base64')
  const logoUrl = `data:${file.type};base64,${base64}`

  await db.clinic.update({
    where: { id: clinicId },
    data: { logoUrl },
  })

  return NextResponse.json({ ok: true, logoUrl })
}

export async function DELETE(request) {
  const { clinicId } = await getDoctorContext()
  if (!clinicId) return unauthorized()

  await db.clinic.update({
    where: { id: clinicId },
    data: { logoUrl: null },
  })

  return NextResponse.json({ ok: true })
}
