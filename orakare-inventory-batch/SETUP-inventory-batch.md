# Push #5 — Batch-based Inventory with FIFO Dispensing

The substantial inventory rebuild. Adds proper stock management:
- Batch-level tracking (each restock = new batch with own qty, cost, expiry)
- FIFO dispensing (oldest expiry first, expired batches skipped)
- Expiry tracking with 30-day-out alerts
- Linked expense creation on restock
- Soft-delete (archive) on items

## What's new

**Schema (additive):**
- `InventoryItem` gets `minOrderQty`, `trackExpiry`, `isActive` columns. Legacy `stockQty` stays but is no longer source of truth.
- New `InventoryBatch` model — each restock creates one
- New `BatchStatus` enum (ACTIVE / DEPLETED / EXPIRED / DAMAGED)
- `InvoiceItem` gets `batchAllocations` JSON column — records which batches were drawn from at dispense time

**Pages:**
- `/dashboard/inventory` — list view with search, summary alerts (low stock / expiring / expired), add new item
- `/dashboard/inventory/[itemId]` — detail view with batch breakdown, restock, edit, archive

**Modals:**
- ItemFormModal — add or edit an item
- RestockModal — create a new batch + linked Expense
- BatchAdjustModal — mark batch as Expired / Damaged / Correct (physical recount)

**API:**
- `GET /api/inventory` — list with batch-aggregated summary per item
- `POST /api/inventory` — create item
- `GET /api/inventory/[itemId]` — detail with all batches
- `PATCH /api/inventory/[itemId]` — edit
- `DELETE /api/inventory/[itemId]` — soft-delete (sets isActive=false)
- `POST /api/inventory/[itemId]/restock` — create batch + linked expense
- `POST /api/inventory/batches/[batchId]/adjust` — expire/damage/correct

**Close-visit endpoint:**
- Pre-transaction FIFO planning. If any line is short on stock, the close is blocked with an actionable error.
- Decrement happens at the BATCH level, not InventoryItem.stockQty.
- Each InvoiceItem records which batches were drawn from in `batchAllocations`.

**Migration script:**
- `scripts/seed-inventory-batches.js` — one-time job that turns each item's existing `stockQty` into a single ACTIVE batch with no expiry. Safe to re-run (skips items with existing batches).

## Files

```
SCHEMA:
  prisma/schema.prisma                                  (InventoryBatch + new fields)
  prisma/migrations/20260616150000_inventory_batches/migration.sql

LIB:
  lib/inventory-fifo.js                                 (FIFO planner + batch summarizer)

API:
  app/api/inventory/route.js                            (NEW: list + create)
  app/api/inventory/[itemId]/route.js                   (NEW: detail/edit/delete)
  app/api/inventory/[itemId]/restock/route.js           (NEW: create batch + expense)
  app/api/inventory/batches/[batchId]/adjust/route.js   (NEW: expire/damage/correct)
  app/api/consultation/visit/[visitId]/close/route.js   (MODIFIED: FIFO at dispense)

PAGES:
  app/dashboard/inventory/page.js                       (NEW)
  app/dashboard/inventory/[itemId]/page.js              (NEW)

COMPONENTS:
  components/inventory/InventoryListView.js             (NEW)
  components/inventory/ItemDetailView.js                (NEW)
  components/inventory/ItemFormModal.js                 (NEW)
  components/inventory/RestockModal.js                  (NEW)
  components/inventory/BatchAdjustModal.js              (NEW)
  components/consultation/InventoryPicker.js            (MODIFIED: reads totalActive)

SCRIPTS:
  scripts/seed-inventory-batches.js                     (one-time migration)
```

17 files total.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-inventory-batch/. .
git status
```

Should show 1 new migration, 1 modified schema, 15 modified/new files.

### Step 1: Apply migration

```bash
npx prisma migrate deploy
npx prisma generate
```

### Step 2: Seed batches from legacy stockQty

This is the critical one-time migration. It creates one ACTIVE batch per existing item with stockQty > 0, no expiry, supplier copied over.

```bash
node scripts/seed-inventory-batches.js
```

Expected output:
```
Seeding inventory batches from legacy stockQty values...
  ✓ Listerine Mouthwash 250ml — 12 bottle
  ✓ Dental composite kit — 3 pack
  ...
Done.
  Migrated: 12
  Skipped (already has batches): 0
  Zero stock (nothing to migrate): 0
```

If you re-run, it should skip everything.

### Step 3: Start dev

```bash
npm run dev
```

## Smoke tests

### Test 1 — Inventory list page loads
1. Click "Inventory" in sidebar → lands on /dashboard/inventory
2. Existing items appear with stock from the seeded batches
3. Summary alerts at top (Low stock / Expiring soon / Expired stock) appear if applicable

### Test 2 — Add a new item
1. Click "+ Add item"
2. Fill: name "Test Mouthwash", category Medication, unit bottle, default unit cost 110, min order 5, supplier "Apollo Pharmacy", trackExpiry on
3. Save → redirects to detail page
4. Detail page shows no batches yet, all summary cards 0

### Test 3 — Restock with expiry + auto-expense
1. On the detail page click "+ Restock"
2. Enter: quantity 12, unit cost 110, expiry 6 months from today, batch code "LOT-A1", supplier auto-filled, createExpense checked
3. Save
4. Detail page refreshes:
   - Active batches table now shows the batch
   - Active stock card = 12
5. Go to `/dashboard/expenses` (or run SQL) → verify a new expense row:
```sql
SELECT id, description, amount, category, date FROM "Expense" ORDER BY "createdAt" DESC LIMIT 1;
```
Should be ₹1320 with description "Inventory restock — Test Mouthwash (12 bottle)".

### Test 4 — FIFO dispense across 2 batches
1. Restock Test Mouthwash AGAIN with: qty 12, cost 125, expiry 12 months out
2. Now item has Batch A (12 bottles, 6mo expiry) + Batch B (12 bottles, 12mo expiry)
3. Start a consultation on any patient → Close-visit screen → Inventory picker
4. Add Test Mouthwash, qty 14
5. Save & close visit
6. Verify in SQL:
```sql
SELECT id, quantity, "initialQuantity", status, "expiryDate"
FROM "InventoryBatch"
WHERE "inventoryItemId" = '<test mouthwash id>'
ORDER BY "expiryDate";
```
Expected: Batch A has quantity 0 and status DEPLETED. Batch B has quantity 10 and status ACTIVE.

7. Verify InvoiceItem.batchAllocations:
```sql
SELECT description, quantity, "batchAllocations"
FROM "InvoiceItem"
WHERE description LIKE '%Test Mouthwash%'
ORDER BY "createdAt" DESC LIMIT 1;
```
Expected: batchAllocations contains 2 entries — Batch A: 12, Batch B: 2.

### Test 5 — Expired batch skipped at dispense
1. Find an existing item with an active batch. Mark that batch's expiry as YESTERDAY via SQL:
```sql
UPDATE "InventoryBatch" SET "expiryDate" = NOW() - INTERVAL '1 day'
WHERE id = '<batch_id>';
```
2. Refresh inventory detail page — that batch shows "Past expiry" pill but is still ACTIVE
3. Try to dispense the item via Close-visit → should fall through to next batch (or error if no other batch exists)

### Test 6 — Damage adjustment
1. On detail page, click Adjust on an active batch
2. Choose "Mark damaged", optional reason "Broken bottles"
3. Apply
4. Batch quantity goes to 0, status DAMAGED
5. Refresh — batch moves from "Active batches" table to "Historical batches" table

### Test 7 — Low stock alert
1. Edit an item, set minOrderQty to a number ABOVE current stock
2. Inventory list page now shows that item highlighted in red, "Low stock" pill
3. Top of page shows "Low stock — X items" summary card

### Test 8 — Block close when out of stock
1. Find an item with very low stock
2. Try to add it to a visit with qty exceeding active stock
3. Save & close visit
4. Should get error: "Not enough stock for inventory item X. Short by Y. Restock or remove from this visit."
5. Visit stays open, no invoice generated, no batches touched

### Test 9 — Soft-delete (archive)
1. On item detail page, click "Archive"
2. Confirm
3. Lands back on inventory list
4. Archived item is gone from the default list
5. Toggle "Show archived" checkbox → item reappears with isActive=false

## Push to production

After all 9 tests pass:

```bash
git add -A
git commit -m "Push #5: batch-based inventory with FIFO dispense, expiry tracking, linked expenses"
git push
```

**Important:** the seed script must be run on production database too, manually after deploy:

```bash
# On prod (run once)
npx prisma migrate deploy
node scripts/seed-inventory-batches.js
```

## What this leaves for later

Deferred (not urgent):
- Drop legacy `stockQty` column once we're confident in batch-based reads (Push #6+)
- Batch-level adjustment audit log (currently we just append a note string to the batch)
- Multi-batch invoice line item display (currently one line, batches in hidden field)
- Re-order recommendations (we have minOrderQty, just don't surface "you should order N more" yet)
- Purchase orders / supplier-side workflow
- Per-sitting consumables (intentionally out of scope per design)

## What Dr. Shobhna sees

Tell her:
- New "Inventory" tab in sidebar (it was there but the page didn't exist)
- Click an item → see all batches with expiry, status, history
- "Restock" creates a new batch with its own cost + expiry. Auto-records an expense.
- Mark batches damaged or expired when needed — original audit stays
- At visit close, items dispense FIFO automatically. Oldest expiry first. Expired stock is skipped.
- Stock alerts show on the inventory list page header

She doesn't need to think about batches at dispense time — the system handles it.
