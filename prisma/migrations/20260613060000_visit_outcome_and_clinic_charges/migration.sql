-- Push #3 Day 1 — additive schema changes for visit-flow redesign.
-- Backward compatible: existing code keeps working because every new field
-- is nullable or has a default that matches old behavior.

-- ─── VisitOutcome enum ────────────────────────────────────────────────────────
CREATE TYPE "VisitOutcome" AS ENUM ('ADVISED', 'CONSENTED', 'TREATED');

-- ─── Visit table — 4 new columns ──────────────────────────────────────────────
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "outcome" "VisitOutcome";
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "advice" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "nextAppointmentDate" TIMESTAMP(3);
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "needsResolution" BOOLEAN NOT NULL DEFAULT false;

-- ─── Clinic table — charges presets ───────────────────────────────────────────
-- JSON array of { id, label, category, amount, active } objects.
-- Used by the Close-visit screen to render quick-charge buttons.
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "charges" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── Risk mitigation: existing historical visits ──────────────────────────────
-- All visits created before this migration are either COMPLETED (historical
-- imports) or in-progress visits created BEFORE the new flow existed. Neither
-- should trigger the force-resolve banner — that's only for NEW visits started
-- AFTER this migration that haven't been properly closed.
--
-- COMPLETED visits: leave needsResolution=false (default), set outcome to
--   TREATED if they have sittings, otherwise ADVISED. This is a best-effort
--   inference; outcome of imported data isn't critical, just gives UI
--   something coherent to render.
--
-- In-progress visits (status != COMPLETED): leave outcome NULL but also leave
--   needsResolution=false so they don't all light up the banner immediately.
--   Dr. Shobhna can decide what to do with them organically.

UPDATE "Visit"
SET "outcome" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "Sitting" s
    INNER JOIN "TreatmentItem" ti ON ti.id = s."treatmentId"
    INNER JOIN "TreatmentPlan" tp ON tp.id = ti."treatmentPlanId"
    WHERE tp."visitId" = "Visit".id
  ) THEN 'TREATED'::"VisitOutcome"
  ELSE 'ADVISED'::"VisitOutcome"
END
WHERE "status" = 'COMPLETED' AND "outcome" IS NULL;

-- Index to support the force-resolve banner query
CREATE INDEX IF NOT EXISTS "Visit_clinicId_needsResolution_idx" ON "Visit"("clinicId", "needsResolution");
