import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const doctor = await db.doctor.findFirst({ where: { email: userId } })
    if (!doctor) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const count = await db.invoice.count({ where: { clinicId: doctor.clinicId } })
    const invoiceNo = 'OKR-INV-' + String(count + 1).padStart(4, '0')

    const invoice = await db.invoice.create({
      data: {
        clinicId: doctor.clinicId,
        patientId: body.patientId,
        invoiceNo,
        date: new Date(body.date + 'T00:00:00+05:30'),
        subtotal: body.subtotal,
        discount: body.discount || 0,
        total: body.total,
        paid: body.paid || 0,
        balance: body.balance || 0,
        paymentMode: body.paymentMode || null,
        notes: body.notes || null,
        status: body.status || 'UNPAID',
        items: {
          create: body.items.map(function(item) {
            return {
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            }
          })
        }
      }
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}