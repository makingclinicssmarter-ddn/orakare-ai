-- Push #3.5 Zip 1 — Invoice.kind enum + backfill.
-- Backward compatible: every new column has a sensible default for old rows.

CREATE TYPE "InvoiceKind" AS ENUM ('VISIT_CHARGES', 'TREATMENT');

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "kind" "InvoiceKind" NOT NULL DEFAULT 'VISIT_CHARGES';

-- Backfill historical invoices to TREATMENT.
-- Heuristic: any Invoice created before 2026-06-13 (before Push #3 Day 1)
-- came from the import script and represents treatment-related billing
-- from Dr. Shobhna's source data.
UPDATE "Invoice"
SET "kind" = 'TREATMENT'
WHERE "createdAt" < '2026-06-13 00:00:00';

-- For invoices created on/after 2026-06-13, they came from the Close-visit
-- POST endpoint. We left those at VISIT_CHARGES (default), which is correct
-- for the ADVISED/CONSENTED test patients (consultation+X-ray+inventory).
-- For OKR-2026-0010 specifically (the misclassified TREATED test invoice),
-- it'll get cleaned up when the user re-tests and deletes the test patient.

CREATE INDEX IF NOT EXISTS "Invoice_clinicId_kind_idx" ON "Invoice"("clinicId", "kind");
