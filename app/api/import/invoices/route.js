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
    const { invoices } = body

    const doctor = await db.doctor.findFirst({
      where: { email: userId },
    })

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    const patients = await db.patient.findMany({
      where: { clinicId: doctor.clinicId },
    })

    const patientByOriginalId = {}
    patients.forEach(function(p) {
      if (p.originalID) patientByOriginalId[p.originalID] = p
    })

    let imported = 0
    let skipped = 0
    let failed = 0

    for (const inv of invoices) {
      try {
        if (!inv.invoiceNo && !inv.id) { failed++; continue }

        const patient = patientByOriginalId[inv.patientId] ||
          patients.find(function(p) {
            return p.name.toLowerCase().trim() === (inv.patientName || '').toLowerCase().trim()
          })

        if (!patient) { skipped++; continue }

        const existing = await db.invoice.findFirst({
          where: { invoiceNo: inv.invoiceNo || inv.id }
        })

        if (existing) { skipped++; continue }

        const invoiceDate = inv.date ? new Date(inv.date + 'T00:00:00+05:30') : new Date()

        const total = parseFloat(inv.total || 0)
        const paid = parseFloat(inv.paid || 0)
        const balance = Math.max(0, total - paid)

        await db.invoice.create({
          data: {
            clinicId: doctor.clinicId,
            patientId: patient.id,
            invoiceNo: inv.invoiceNo || inv.id || 'INV-' + Date.now(),
            date: invoiceDate,
            subtotal: parseFloat(inv.subtotal || total),
            discount: parseFloat(inv.discount || 0),
            total,
            paid,
            balance,
            paymentMode: inv.paymentMode || inv.mode || null,
            notes: inv.notes || null,
            status: balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
          }
        })
        imported++
      } catch (e) {
        console.error('Invoice import error:', e.message)
        failed++
      }
    }

    return NextResponse.json({ imported, skipped, failed }, { status: 200 })

  } catch (error) {
    console.error('Invoice import error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}