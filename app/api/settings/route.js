import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    const doctor = await db.doctor.findFirst({
      where: { clerkId: userId },
    })

    if (!doctor) {
      console.log('Doctor not found for userId:', userId)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await db.clinic.update({
      where: { id: doctor.clinicId },
      data: {
        name: body.clinicName || undefined,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        gstNo: body.gstNo || null,
        qualification: body.qualification || null,
        regNo: body.regNo || null,
        googleReviewUrl: body.googleReviewUrl || null,
        invoicePrefix: body.invoicePrefix || 'OKR',
      }
    })

    await db.doctor.update({
      where: { id: doctor.id },
      data: {
        name: body.doctorName || undefined,
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}