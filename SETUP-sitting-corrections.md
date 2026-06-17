# Push #5 — Sitting Correction Notes

Small standalone push. Adds append-only correction notes to sittings.

## What it does

Each sitting card in the treatment detail page now has a small "+ Note" button.
Click it → modal opens for a correction/addendum note → save → appended to the
sitting with a timestamp.

The original sitting fields (date, description, notes) stay immutable. Corrections
are displayed below the sitting in an amber-tinted block.

This is the medico-legally defensible pattern:
- Audit trail: original record stays exactly as first written
- Correction trail: each addendum has its own timestamp
- Anyone reviewing later sees what was originally written AND what was added later

## Files

```
SCHEMA:
  prisma/schema.prisma
  prisma/migrations/20260616140000_sitting_corrections/migration.sql

API:
  app/api/sittings/[sittingId]/corrections/route.js  (NEW)

UI:
  components/treatments/SittingCorrectionButton.js   (NEW)
  components/treatments/TreatmentDetailView.js        (renders button + corrections)
```

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-sitting-corrections/. .

npx prisma migrate deploy
npx prisma generate
npm run dev
```

Migration adds one JSONB column to Sitting table. Additive only.

## Smoke tests

### Test 1 — Add a correction
1. Open any patient with an existing sitting
2. Go to Treatments tab → click any treatment with sittings
3. Find a sitting card in the Sittings section
4. Click "+ Note" button (small, slate-bordered)
5. Modal: type "Correction: actual date was 12 Jun, not 14 Jun."
6. Click "Append note"
7. Modal closes, sitting card refreshes
8. Below the sitting description, see "Corrections (1)" with the appended note + today's date

### Test 2 — Multiple corrections
1. On the same sitting, click "+ Note" again
2. Add a second correction: "Addendum: also performed scaling."
3. Save
4. Section header now says "Corrections (2)" with both entries listed in order added

### Test 3 — Original stays unchanged
1. Verify the sitting's date, description, and notes are exactly as before
2. Only the corrections section is new

```sql
SELECT id, date, description, notes, corrections
FROM "Sitting" WHERE id = '<sittingId>';
```

The `description`, `notes`, `date` should be unchanged from before the correction was added. `corrections` should contain a JSON array with your appended notes.

## Deploy to production

```bash
git add -A
git commit -m "Push #5: append-only correction notes on sittings"
git push
```
