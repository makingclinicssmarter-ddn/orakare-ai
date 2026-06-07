import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, status, paidDate } = await request.json()

    const fee = await db.feeEntry.update({
      where: { id },
      data: {
        status,
        paidDate: paidDate ? new Date(paidDate) : null,
      }
    })
    return NextResponse.json({ fee })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}