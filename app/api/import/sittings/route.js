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
    const { sittings } = body

    if (!sittings || !Array.isArray(sittings)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const patients = await db.patient.findMany({
      where: { clinicId: doctor.clinicId },
    })

    const patientByOriginalId = {}
    patients.forEach(function(p) {
      if (p.originalID) patientByOriginalId[p.originalID] = p
    })

    const treatmentItems = await db.treatmentItem.findMany({
      include: { treatmentPlan: true }
    })

    const itemByOriginalId = {}
    treatmentItems.forEach(function(t) {
      if (t.originalID) itemByOriginalId[t.originalID] = t
    })

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const s of sittings) {
      try {
        const treatmentItem = itemByOriginalId[s.treatmentId]
        if (!treatmentItem) { skipped++; continue }

        const patient = patientByOriginalId[s.patientId] ||
          patients.find(function(p) {
            return p.name.toLowerCase().trim() === (s.patientName || '').toLowerCase().trim()
          })

        if (!patient) { skipped++; continue }

        const sittingDate = s.date ? new Date(s.date) : new Date()
        if (isNaN(sittingDate.getTime())) { skipped++; continue }

        await db.sitting.create({
          data: {
            clinicId: doctor.clinicId,
            patientId: patient.id,
            treatmentId: treatmentItem.id,
            date: sittingDate,
            done: true,
            description: s.done || null,
            prescription: s.prescription || null,
            notes: s.notes || null,
            consumablesTotal: parseFloat(s.consumablesTotal || 0),
            paid: parseFloat(s.paid || 0),
            payMode: s.payMode || s.paymode || null,
            savedAt: new Date(),
          }
        })

        imported++
      } catch (e) {
        console.error('Failed to import sitting:', e.message)
        failed++
      }
    }

    return NextResponse.json({ imported, skipped, failed }, { status: 200 })

  } catch (error) {
    console.error('Sitting import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}