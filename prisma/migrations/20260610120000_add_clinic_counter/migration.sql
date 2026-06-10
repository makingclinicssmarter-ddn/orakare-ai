-- Push #1: Add ClinicCounter for race-free patient and invoice numbering
-- and backfill counters from existing data so new IDs continue the sequence
-- already in use by each clinic.

-- CreateTable
CREATE TABLE "ClinicCounter" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicCounter_clinicId_kind_key" ON "ClinicCounter"("clinicId", "kind");

-- Backfill PATIENT counter from existing patient counts per clinic
INSERT INTO "ClinicCounter" ("id", "clinicId", "kind", "lastValue", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "clinicId",
    'PATIENT',
    COUNT(*)::int,
    NOW(),
    NOW()
FROM "Patient"
GROUP BY "clinicId"
ON CONFLICT ("clinicId", "kind") DO NOTHING;

-- Backfill INVOICE counter from existing invoice counts per clinic
INSERT INTO "ClinicCounter" ("id", "clinicId", "kind", "lastValue", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "clinicId",
    'INVOICE',
    COUNT(*)::int,
    NOW(),
    NOW()
FROM "Invoice"
GROUP BY "clinicId"
ON CONFLICT ("clinicId", "kind") DO NOTHING;
