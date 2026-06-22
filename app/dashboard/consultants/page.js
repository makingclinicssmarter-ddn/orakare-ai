import ConsultantsListView from '@/components/consultants/ConsultantsListView'

export const dynamic = 'force-dynamic'

export default function ConsultantsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Consultants</h1>
        <p className="text-sm text-slate-500 mt-0.5">On-call specialists and their pending payouts.</p>
      </div>
      <ConsultantsListView />
    </div>
  )
}
