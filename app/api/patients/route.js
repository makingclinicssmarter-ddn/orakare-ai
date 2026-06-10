import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized } from '@/lib/auth-helpers'
import { nextCounter, formatPatientId } from '@/lib/counter'

export async function POST(request) {
  try {
    const { clinicId, doctorId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const {
      name, age, gender, mobile, address, abhaId,
      medicalHistory, dentalHistory, personalHistory,
    } = body

    if (!name || !age || !gender || !mobile) {
      return NextResponse.json({ error: 'Name, age, gender and mobile are required' }, { status: 400 })
    }

    // Race-free patient-number generation per clinic
    const seq = await nextCounter(clinicId, 'PATIENT')
    const originalID = formatPatientId(seq)

    // Patient + optional visit/history wrapped in a transaction
    const patient = await db.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          clinicId,
          name: name.trim(),
          age: parseInt(age),
          gender,
          mobile: mobile.trim(),
          address: address?.trim() || null,
          abhaId: abhaId?.trim() || null,
          originalID,
          dentalHistory: dentalHistory || {},
          personalHistory: personalHistory || {},
        },
      })

      if (medicalHistory?.conditions || medicalHistory?.allergies || medicalHistory?.medications) {
        const visit = await tx.visit.create({
          data: {
            clinicId,
            patientId: created.id,
            doctorId,
            status: 'REGISTERED',
          },
        })
        await tx.medicalHistory.create({
          data: {
            visitId: visit.id,
            chiefComplaint: 'Recorded at registration',
            conditions: medicalHistory.conditions || [],
            allergies: medicalHistory.allergies || [],
            medications: medicalHistory.medications || [],
            collectedBy: 'registration',
          },
        })
      }

      return created
    })

    return NextResponse.json({ patient }, { status: 201 })

  } catch (error) {
    console.error('Patient creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50

    const where = {
      clinicId,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
          { originalID: { contains: search, mode: 'insensitive' } },
        ]
      } : {}),
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        include: {
          visits: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      db.patient.count({ where }),
    ])

    return NextResponse.json({ patients, total, page, limit }, { status: 200 })

  } catch (error) {
    console.error('Patient fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
