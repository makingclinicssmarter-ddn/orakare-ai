-- Append-only correction notes on sittings.
-- Original sitting fields stay immutable; corrections are timestamped
-- entries added below. Defensible audit trail.

ALTER TABLE "Sitting"
  ADD COLUMN IF NOT EXISTS "corrections" JSONB NOT NULL DEFAULT '[]'::jsonb;
