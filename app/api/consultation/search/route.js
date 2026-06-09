import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) return NextResponse.json({ patients: [] })

    const doctor = await db.doctor.findFirst({ where: { clerkId: userId } })
    if (!doctor) return NextResponse.json({ patients: [] })

    const patients = await db.patient.findMany({
      where: {
        clinicId: doctor.clinicId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { mobile: { contains: q } },
          { originalID: { contains: q, mode: 'insensitive' } },
        ]
      },
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            treatmentPlan: {
              include: {
                treatmentItems: true
              }
            }
          }
        }
      },
      take: 8,
    })

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Consultation search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}