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
    const { treatments } = body

    if (!treatments || !Array.isArray(treatments)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    let doctor = await db.doctor.findFirst({
      where: { email: userId },
      include: { clinic: true }
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

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const t of treatments) {
      try {
        if (!t.patientId && !t.patientName) { failed++; continue }

        const patient = patientByOriginalId[t.patientId] ||
  patients.find(function(p) {
    return p.name.toLowerCase().trim() === (t.patientName || '').toLowerCase().trim()
  })

if (!patient) {
  console.log('Could not match patient:', t.patientId, t.patientName)
  skipped++
  continue
}

        const isOngoing = !t.status ||
          t.status === '' ||
          t.status === '1' ||
          String(t.status).toLowerCase() === 'ongoing'

        let visit = await db.visit.findFirst({
          where: { patientId: patient.id },
          orderBy: { createdAt: 'desc' },
        })

        if (!visit) {
          visit = await db.visit.create({
            data: {
              clinicId: doctor.clinicId,
              patientId: patient.id,
              doctorId: doctor.id,
              status: isOngoing ? 'TREATMENT_PLANNED' : 'COMPLETED',
            }
          })
        }

        const existingPlan = await db.treatmentPlan.findUnique({
          where: { visitId: visit.id },
        })

        let plan = existingPlan
        if (!plan) {
          plan = await db.treatmentPlan.create({
            data: {
              visitId: visit.id,
              approvedBy: doctor.id,
            }
          })
        }

        const estimate = parseFloat(t.estimate || 0)
        const discount = parseFloat(t.discount || 0)
        const netCost = Math.max(0, estimate - discount)

        await db.treatmentItem.create({
  data: {
    treatmentPlanId: plan.id,
    procedureName: t.type || t.procedureName || 'Treatment',
    toothRef: t.area || null,
    urgency: 'PLANNED',
    estimatedCost: netCost,
    estimatedSessions: parseInt(t.expectedSittings || t.sittings || 1),
    consentStatus: 'SIGNED',
    originalID: t.id || null,
  }
})

        imported++
      } catch (e) {
        console.error('Failed to import treatment:', t, e)
        failed++
      }
    }

    return NextResponse.json({ imported, skipped, failed }, { status: 200 })

  } catch (error) {
    console.error('Treatment import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}