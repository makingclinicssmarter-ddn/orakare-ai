-- Push #2C — soft-delete (archive) support for Patient.
-- `archivedAt` IS NULL means active. NOT NULL means archived (and when).
-- Composite index (clinicId, archivedAt) accelerates "list active patients
-- for this clinic" which is the most common query.

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Patient_clinicId_archivedAt_idx"
  ON "Patient"("clinicId", "archivedAt");
