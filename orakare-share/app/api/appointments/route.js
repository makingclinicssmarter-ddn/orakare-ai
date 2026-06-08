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
    const { name, phone, email, service, date, slot, notes } = body

    if (!name || !date || !slot) {
      return NextResponse.json({ error: 'Name, date and slot are required' }, { status: 400 })
    }

    let doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const appointmentDate = new Date(date + 'T' + slot + ':00+05:30')

    const appointment = await db.appointment.create({
      data: {
        clinicId: doctor.clinicId,
        name,
        phone: phone || null,
        email: email || null,
        service: service || null,
        date: appointmentDate,
        slot,
        notes: notes || null,
        status: 'SCHEDULED',
      }
    })

    return NextResponse.json({ appointment }, { status: 201 })

  } catch (error) {
    console.error('Appointment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    }

    const appointment = await db.appointment.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ appointment }, { status: 200 })

  } catch (error) {
    console.error('Appointment update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}