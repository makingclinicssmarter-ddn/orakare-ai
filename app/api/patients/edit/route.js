import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyPatientAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

export async function PATCH(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    const { id, name, age, gender, mobile, address } = body
    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 })
    }

    const patient = await verifyPatientAccess(id, clinicId)
    if (!patient) return forbidden('Patient not in your clinic')

    const updated = await db.patient.update({
      where: { id },
      data: {
        name,
        age: parseInt(age) || 0,
        gender: gender || '',
        mobile: mobile || '',
        address: address || null,
      }
    })

    return NextResponse.json({ patient: updated })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
