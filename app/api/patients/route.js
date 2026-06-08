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
    const {
      name, age, gender, mobile, address, abhaId,
      medicalHistory, dentalHistory, personalHistory,
    } = body

    if (!name || !age || !gender || !mobile) {
      return NextResponse.json({ error: 'Name, age, gender and mobile are required' }, { status: 400 })
    }

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // Generate patient ID in ORK-001 format
    const count = await db.patient.count({
      where: { clinicId: doctor.clinicId },
    })
    const originalID = 'ORK-' + String(count + 1).padStart(3, '0')

    const patient = await db.patient.create({
      data: {
        clinicId: doctor.clinicId,
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

    // If medical history provided at registration, store it against a visit
    if (medicalHistory?.conditions || medicalHistory?.allergies || medicalHistory?.medications) {
      const visit = await db.visit.create({
        data: {
          clinicId: doctor.clinicId,
          patientId: patient.id,
          doctorId: doctor.id,
          status: 'REGISTERED',
        },
      })

      await db.medicalHistory.create({
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

    return NextResponse.json({ patient }, { status: 201 })

  } catch (error) {
    console.error('Patient creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    const where = {
      clinicId: doctor.clinicId,
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
          visits: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
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