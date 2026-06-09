import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import FinanceView from '@/components/finance/FinanceView'

export default async function FinancePage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
  })

  const [sittings, expenses, feeEntries] = doctor ? await Promise.all([
    db.sitting.findMany({
      where: { clinicId: doctor.clinicId },
      orderBy: { date: 'desc' },
    }),
    db.expense.findMany({
      where: { clinicId: doctor.clinicId },
      orderBy: { date: 'desc' },
    }),
    db.feeEntry.findMany({
      where: { clinicId: doctor.clinicId },
      include: { consultant: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]) : [[], [], []]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-400 mt-1">Revenue, expenses and profit</p>
      </div>
      <FinanceView
        sittings={sittings}
        expenses={expenses}
        feeEntries={feeEntries}
      />
    </div>
  )
}