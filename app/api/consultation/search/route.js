import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext } from '@/lib/auth-helpers'

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
