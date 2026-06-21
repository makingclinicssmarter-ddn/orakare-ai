import FinanceView from '@/components/finance/FinanceView'

export const dynamic = 'force-dynamic'

export default function FinancePage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Finance</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revenue, expenses, and net by custom date range.</p>
      </div>
      <FinanceView />
    </div>
  )
}
