import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, name, age, gender, mobile, address } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 })
    }

    const patient = await db.patient.update({
      where: { id },
      data: {
        name,
        age: parseInt(age) || 0,
        gender: gender || '',
        mobile: mobile || '',
        address: address || null,
      }
    })

    return NextResponse.json({ patient })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}