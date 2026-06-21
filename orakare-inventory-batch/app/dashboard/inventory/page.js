import InventoryListView from '@/components/inventory/InventoryListView'

export const dynamic = 'force-dynamic'

export default function InventoryPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Stock by batch, FIFO dispensing, expiry tracking.</p>
        </div>
      </div>
      <InventoryListView />
    </div>
  )
}
