-- Migration: allow_null_patient_on_invoice_receipt
-- Allow walk-in counter sales (no patient record) on Invoice and Receipt

ALTER TABLE "Invoice" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Receipt" ALTER COLUMN "patientId" DROP NOT NULL;
