import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import InventoryView from '@/components/inventory/InventoryView'

export default async function InventoryPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
  })

  const items = doctor ? await db.inventoryItem.findMany({
    where: { clinicId: doctor.clinicId },
    orderBy: { name: 'asc' },
  }) : []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-400 mt-1">
          Consumables, materials and supplies
        </p>
      </div>
      <InventoryView items={items} />
    </div>
  )
}