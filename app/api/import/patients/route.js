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
    const { patients } = body

    if (!patients || !Array.isArray(patients)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    let doctor = await db.doctor.findFirst({
      where: { email: userId },
      include: { clinic: true }
    })

    if (!doctor) {
      const clinic = await db.clinic.create({
        data: { name: 'My Clinic' }
      })
      doctor = await db.doctor.create({
        data: {
          name: 'Doctor',
          email: userId,
          clinicId: clinic.id,
        },
        include: { clinic: true }
      })
    }

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const p of patients) {
      try {
        if (!p.name) {
          failed++
          continue
        }

        const existing = await db.patient.findFirst({
          where: {
            clinicId: doctor.clinicId,
            name: p.name,
            mobile: p.mobile || '',
          }
        })

        if (existing) {
          skipped++
          continue
        }

        const age = parseInt(p.age) || 0
        const gender = p.gender || 'Unknown'

        await db.patient.create({
          data: {
            clinicId: doctor.clinicId,
            name: p.name,
            age,
            gender,
            mobile: p.mobile || '',
            abhaId: null,
          }
        })

        imported++
      } catch (e) {
        console.error('Failed to import patient:', p.name, e)
        failed++
      }
    }

    return NextResponse.json({ imported, skipped, failed }, { status: 200 })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}