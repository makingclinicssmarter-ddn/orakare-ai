import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import { summarizeBatches } from '@/lib/inventory-fifo'
import CounterSaleForm from '@/components/counter-sale/CounterSaleForm'

export const dynamic = 'force-dynamic'

export default async function CounterSalePage() {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  const items = await db.inventoryItem.findMany({
    where: { clinicId: ctx.clinicId, isActive: true },
    include: {
      batches: {
        where: { status: 'ACTIVE', quantity: { gt: 0 } },
        select: { quantity: true, unitCost: true, expiryDate: true, status: true, receivedDate: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Push #13b: OraKare stores MRP (customer-facing price) in InventoryItem.unitCost
  // — same field the visit-close InventoryPicker uses. No separate sellingPrice.
  const itemsForPicker = items.map(function(it) {
    const summary = summarizeBatches(it.batches || [])
    return {
      id: it.id,
      name: it.name,
      unit: it.unit || '',
      mrp: Number(it.unitCost || 0),
      totalActive: summary.totalActive,
      totalAtRisk: summary.totalAtRisk,
    }
  }).filter(function(it) { return it.totalActive > 0 })

  return (
    <div>
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="text-xl font-medium text-slate-900">Counter sale</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Over-the-counter sale — inventory items to walk-in or existing patient
        </p>
      </div>
      <div className="p-8 max-w-4xl">
        <CounterSaleForm inventoryItems={itemsForPicker} />
      </div>
    </div>
  )
}
