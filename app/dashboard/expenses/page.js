import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import ExpensesView from '@/components/expenses/ExpensesView'

export default async function ExpensesPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
  })

  const expenses = doctor ? await db.expense.findMany({
    where: { clinicId: doctor.clinicId },
    orderBy: { date: 'desc' },
  }) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Expenses</h1>
        <p className="text-sm text-gray-400 mt-1">Clinic expense tracking</p>
      </div>
      <ExpensesView expenses={expenses} />
    </div>
  )
}