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
    const { expenses } = body

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    let imported = 0
    let failed = 0

    for (const e of expenses) {
      try {
        if (!e.description && !e.desc) { failed++; continue }
        const date = e.date ? new Date(e.date) : new Date()
        if (isNaN(date.getTime())) { failed++; continue }

        await db.expense.create({
          data: {
            clinicId: doctor.clinicId,
            description: e.description || e.desc || 'Expense',
            category: e.category || null,
            amount: parseFloat(e.amount || 0),
            date,
            payee: e.payee || null,
            paymentMode: e.paymentMode || e.mode || null,
            notes: e.notes || null,
            recurring: e.recurring === true || e.recurring === 'TRUE' || e.recurring === '1',
          }
        })
        imported++
      } catch (e) {
        console.error('Expense import error:', e.message)
        failed++
      }
    }

    return NextResponse.json({ imported, failed }, { status: 200 })

  } catch (error) {
    console.error('Expenses import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}