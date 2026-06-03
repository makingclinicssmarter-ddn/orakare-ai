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
    const { name, age, gender, mobile, abhaId } = body

    if (!name || !age || !gender || !mobile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get or create clinic for this user
    let clinic = await db.clinic.findFirst({
      where: { doctors: { some: { email: userId } } }
    })

    if (!clinic) {
      clinic = await db.clinic.create({
        data: {
          name: 'My Clinic',
          doctors: {
            create: {
              name: 'Doctor',
              email: userId,
            }
          }
        },
        include: { doctors: true }
      })
    }

    const patient = await db.patient.create({
      data: {
        name,
        age: parseInt(age),
        gender,
        mobile,
        abhaId: abhaId || null,
        clinicId: clinic.id,
        visits: {
          create: {
            clinicId: clinic.id,
            doctorId: clinic.doctors[0].id,
            status: 'REGISTERED',
          }
        }
      }
    })

    return NextResponse.json({ patient }, { status: 201 })

  } catch (error) {
    console.error('Patient registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}