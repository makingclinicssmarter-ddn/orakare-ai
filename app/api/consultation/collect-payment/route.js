import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDoctorContext,
  verifyPatientAccess,
  unauthorized,
  forbidden,
} from '@/lib/auth-helpers'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { patientId, amount, paymentMode, notes } = body
    if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

    const patient = await verifyPatientAccess(patientId, clinicId)
    if (!patient) return forbidden('Patient not in your clinic')

    const receipt = await db.receipt.create({
      data: {
        clinicId,
        patientId,
        amount,
        paymentMode,
        notes: notes || 'General payment',
        date: new Date(),
      },
    })

    return NextResponse.json({ receipt }, { status: 201 })

  } catch (error) {
    console.error('Collect payment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
