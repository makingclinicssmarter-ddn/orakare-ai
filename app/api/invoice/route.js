import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyPatientAccess, unauthorized, forbidden } from '@/lib/auth-helpers'
import { nextCounter, formatInvoiceNo } from '@/lib/counter'

export async function POST(request) {
  try {
    const { clinicId } = await getDoctorContext()
    if (!clinicId) return unauthorized()

    const body = await request.json()
    if (!body.patientId) {
      return NextResponse.json({ error: 'patientId required' }, { status: 400 })
    }

    const patient = await verifyPatientAccess(body.patientId, clinicId)
    if (!patient) return forbidden('Patient not in your clinic')

    // Fetch clinic for invoice prefix (parallelize with counter increment)
    const [clinic, seq] = await Promise.all([
      db.clinic.findUnique({
        where: { id: clinicId },
        select: { invoicePrefix: true },
      }),
      nextCounter(clinicId, 'INVOICE'),
    ])

    const invoiceNo = formatInvoiceNo(clinic?.invoicePrefix || 'OKR', seq)

    const invoice = await db.invoice.create({
      data: {
        clinicId,
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
          create: (body.items || []).map(function(item) {
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
