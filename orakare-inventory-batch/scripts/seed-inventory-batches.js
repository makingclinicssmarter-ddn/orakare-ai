// One-time migration: convert legacy InventoryItem.stockQty into an InventoryBatch.
// For each item with stockQty > 0, create a single batch with that quantity,
// no expiry (since legacy data didn't track it), and a note marking it as
// migrated.
//
// SAFE TO RE-RUN: skips items that already have any batch (regardless of status).
//
// Run from project root:
//   node scripts/seed-inventory-batches.js

const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  console.log('Seeding inventory batches from legacy stockQty values...')

  const items = await db.inventoryItem.findMany({
    include: { batches: { select: { id: true } } },
  })

  let migrated = 0
  let skipped = 0
  let zero = 0

  for (const item of items) {
    if (item.batches.length > 0) {
      skipped++
      continue
    }
    const qty = Math.floor(Number(item.stockQty) || 0)
    if (qty <= 0) {
      zero++
      continue
    }

    await db.inventoryBatch.create({
      data: {
        clinicId: item.clinicId,
        inventoryItemId: item.id,
        batchCode: null,
        quantity: qty,
        initialQuantity: qty,
        unitCost: Number(item.unitCost) || 0,
        expiryDate: null,
        receivedDate: item.createdAt,
        supplier: item.supplier || null,
        notes: 'Migrated from pre-batch inventory (legacy stockQty)',
        status: 'ACTIVE',
      },
    })

    migrated++
    console.log('  ✓ ' + item.name + ' — ' + qty + ' ' + (item.unit || 'units'))
  }

  console.log('')
  console.log('Done.')
  console.log('  Migrated: ' + migrated)
  console.log('  Skipped (already has batches): ' + skipped)
  console.log('  Zero stock (nothing to migrate): ' + zero)
}

main()
  .catch(function(e) {
    console.error(e)
    process.exit(1)
  })
  .finally(async function() {
    await db.$disconnect()
  })
