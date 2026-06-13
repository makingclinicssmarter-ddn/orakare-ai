-- Push #2C — archive ORK-044 (the duplicate of ORK-052 that Dr. Shobhna noticed).
-- ORK-044 has a stub visit (no medical history, no consent, no findings) which
-- was created by an abandoned start-consultation click. ORK-052 holds the
-- real active visit data.
--
-- Run AFTER deploying Push #2C (the `archivedAt` column must exist first).

BEGIN;

UPDATE "Patient"
SET "archivedAt" = NOW(), "updatedAt" = NOW()
WHERE "originalID" = 'ORK-044'
  AND "archivedAt" IS NULL;

-- Verify
SELECT "originalID", name, "archivedAt"
FROM "Patient"
WHERE "originalID" IN ('ORK-044', 'ORK-052')
ORDER BY "originalID";

COMMIT;
