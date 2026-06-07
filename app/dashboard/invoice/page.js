import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import InvoiceView from '@/components/invoice/InvoiceView'

export default async function InvoicePage({ searchParams }) {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { email: userId },
    include: { clinic: true },
  })

  const invoices = doctor ? await db.invoice.findMany({
    where: { clinicId: doctor.clinicId },
    include: { patient: true, items: true },
    orderBy: { date: 'desc' },
    take: 100,
  }) : []

  const patients = doctor ? await db.patient.findMany({
    where: { clinicId: doctor.clinicId },
    orderBy: { name: 'asc' },
  }) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-400 mt-1">Billing and payment tracking</p>
      </div>
      <InvoiceView
        invoices={invoices}
        patients={patients}
        clinic={doctor?.clinic}
        doctorName={doctor?.name}
      />
    </div>
  )
}