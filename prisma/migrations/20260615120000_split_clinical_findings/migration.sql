-- Push #4 Wave 2 — split clinical findings into clinical + radiographical
-- Additive only. Existing `clinicalNotes` stays for backward compat.
-- New visits write the split fields; old visits still readable via fallback.

ALTER TABLE "ClinicalFindings"
  ADD COLUMN IF NOT EXISTS "clinicalFindings" TEXT,
  ADD COLUMN IF NOT EXISTS "radiographicalFindings" TEXT;
