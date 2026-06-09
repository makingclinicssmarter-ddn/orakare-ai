import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { patientId } = body

    const doctor = await db.doctor.findFirst({ where: { clerkId: userId } })
    if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

    // Check for incomplete visit
    const incompleteVisit = await db.visit.findFirst({
      where: {
        patientId,
        status: {
          notIn: ['COMPLETED']
        }
      },
      include: {
        treatmentPlan: {
          include: { treatmentItems: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (incompleteVisit) {
      // Has consented treatment items → go to sittings
      const hasConsentedItems = incompleteVisit.treatmentPlan?.treatmentItems?.some(
        function(item) { return item.consentStatus === 'SIGNED' }
      )

      return NextResponse.json({
        visitId: incompleteVisit.id,
        resuming: true,
        goTo: hasConsentedItems ? 'sittings' : getResumeScreen(incompleteVisit.status)
      })
    }

    // Create new visit
    const visit = await db.visit.create({
      data: {
        patientId,
        clinicId: doctor.clinicId,
        doctorId: doctor.id,
        status: 'REGISTERED',
      }
    })

    return NextResponse.json({
      visitId: visit.id,
      resuming: false,
      goTo: 'start'
    })

  } catch (error) {
    console.error('Consultation start error:', error)
    return NextResponse.json({ error: 'Failed to start consultation' }, { status: 500 })
  }
}

function getResumeScreen(status) {
  switch (status) {
    case 'REGISTERED':
      return 'start'
    case 'HISTORY_TAKEN':
      return 'examination'
    case 'EXAM_CONSENT_SIGNED':
      return 'examination'
    case 'EXAMINATION_DONE':
      return 'treatment'
    case 'TREATMENT_PLANNED':
      return 'consent'
    case 'TREATMENT_CONSENT_SIGNED':
      return 'sittings'
    default:
      return 'start'
  }
}