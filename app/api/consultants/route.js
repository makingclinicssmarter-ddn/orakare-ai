import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const doctor = await db.doctor.findFirst({ where: { clerkId: userId } })
    if (!doctor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const consultant = await db.consultant.create({
      data: {
        clinicId: doctor.clinicId,
        name: body.name,
        specialization: body.specialization || null,
        phone: body.phone || null,
        email: body.email || null,
        splitType: body.splitType || null,
        splitValue: parseFloat(body.splitValue || 0),
        notes: body.notes || null,
        active: body.active !== false,
      }
    })
    return NextResponse.json({ consultant }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...data } = body

    const consultant = await db.consultant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.specialization !== undefined && { specialization: data.specialization || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.splitType !== undefined && { splitType: data.splitType || null }),
        ...(data.splitValue !== undefined && { splitValue: parseFloat(data.splitValue || 0) }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.active !== undefined && { active: data.active }),
      }
    })
    return NextResponse.json({ consultant })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    await db.consultant.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}