import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext } from '@/lib/auth-helpers'

// Consultation search EXCLUDES archived patients (archivedAt IS NULL).
// Archived patients should never be candidates for starting a new consultation.
// If a dentist needs to access them, they go through the patient list with
// the "Show archived" toggle on.
export async function GET(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return NextResponse.json({ patients: [] })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    if (q.length < 2) return NextResponse.json({ patients: [] })

    const patients = await db.patient.findMany({
      where: {
        clinicId,
        archivedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { mobile: { contains: q } },
          { originalID: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            treatmentPlan: { include: { treatmentItems: true } },
          },
        },
      },
      take: 8,
    })

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Consultation search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
