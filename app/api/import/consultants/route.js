import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { consultants } = body

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const c of consultants) {
      try {
        if (!c.name) { failed++; continue }

        const existing = await db.consultant.findFirst({
          where: {
            clinicId: doctor.clinicId,
            name: c.name,
          }
        })

        if (existing) { skipped++; continue }

        await db.consultant.create({
          data: {
            clinicId: doctor.clinicId,
            name: c.name,
            specialization: c.specialization || null,
            phone: c.phone || null,
            email: c.email || null,
            splitType: c.splitType || c.split_type || null,
            splitValue: parseFloat(c.splitValue || c.split_value || 0),
            notes: c.notes || null,
            active: c.active !== 'No' && c.active !== false,
          }
        })
        imported++
      } catch (e) {
        console.error('Consultant import error:', e.message)
        failed++
      }
    }

    return NextResponse.json({ imported, skipped, failed }, { status: 200 })

  } catch (error) {
    console.error('Consultants import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}