-- Push #5: Batch-based inventory with FIFO dispensing and expiry tracking.
-- Additive migration. Existing stockQty stays for backward compat — we'll
-- run a one-time script to seed batches from current stockQty values.

-- 1. InventoryItem gets new fields
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "minOrderQty"   INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "trackExpiry"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isActive"      BOOLEAN NOT NULL DEFAULT true;

-- 2. New BatchStatus enum
DO $$ BEGIN
  CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'EXPIRED', 'DAMAGED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. InventoryBatch table
CREATE TABLE IF NOT EXISTS "InventoryBatch" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "clinicId"         TEXT NOT NULL,
  "inventoryItemId"  TEXT NOT NULL,
  "batchCode"        TEXT,
  "quantity"         INTEGER NOT NULL DEFAULT 0,
  "initialQuantity"  INTEGER NOT NULL DEFAULT 0,
  "unitCost"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "expiryDate"       TIMESTAMP(3),
  "receivedDate"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supplier"         TEXT,
  "expenseId"        TEXT,
  "notes"            TEXT,
  "status"           "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryBatch_inventoryItemId_fkey"
    FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryBatch_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE,
  CONSTRAINT "InventoryBatch_expenseId_fkey"
    FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "InventoryBatch_clinicId_idx" ON "InventoryBatch"("clinicId");
CREATE INDEX IF NOT EXISTS "InventoryBatch_inventoryItemId_idx" ON "InventoryBatch"("inventoryItemId");
CREATE INDEX IF NOT EXISTS "InventoryBatch_clinicId_expiryDate_idx" ON "InventoryBatch"("clinicId", "expiryDate");
CREATE INDEX IF NOT EXISTS "InventoryBatch_status_idx" ON "InventoryBatch"("status");

-- 4. InvoiceItem learns to remember which batches were dispensed from
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS "batchAllocations" JSONB NOT NULL DEFAULT '[]'::jsonb;
