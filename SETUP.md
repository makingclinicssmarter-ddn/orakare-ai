# Push #2C — Setup Guide (revised)

## What this push delivers

1. **Patient Records page** at `/dashboard/patients/[id]` — treatment-nested view
   matching Dr. Shobhna's Google Sheet structure:
   - Treatments listed top-level (sorted by start date, newest first)
   - Sittings nested under each treatment (oldest first within a treatment)
   - Each sitting shows: date, what was done, prescription, consumables, payment
   - Planned-but-not-started treatments (consent signed, no Treatment row yet)
     show as a separate dashed-border row inline
   - "Other activity" section for consultation-only visits, standalone invoices,
     and standalone receipts (advance payments)
   - Financial summary cards: Treatments estimate, Invoiced, Collected, Pending
     dues (or Credit balance if patient overpaid)

2. **Click behavior changed** — clicking a patient row in `/dashboard/patients`
   now navigates to their Records page (not directly into consultation).
   The "Start consultation" button on each row still works as a quick action.
   Consultation entry from `/dashboard/consultation` search is unchanged —
   that flow remains consultation-first.

3. **Archive support** — Patient.archivedAt column + UI to archive/unarchive
   from the Records page. Archived patients excluded from consultation search,
   shown with reduced opacity in patient list, gated behind "Show archived"
   toggle. Count display: "X active, +Y archived".

4. **Duplicate mobile warning** during registration — when mobile field is
   blurred, an API call checks for existing patients (active or archived) with
   the same mobile. If found, inline warning with "Open existing" / "Continue
   anyway" options.

5. **ORK-044 cleanup** — SQL script archives the duplicate.

## Deploy

### 1. Drop files in
```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push2c/. .
git status
```

### 2. Run migration locally
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Local smoke test
Start `npm run dev`. Walk through:

- **Records view loads.** Open `/dashboard/patients` → click any patient with
  treatments — should land on `/dashboard/patients/<id>` showing the
  treatment-nested view.
- **Sitting detail.** Expand a treatment — confirm sittings show prescription
  and consumables when present.
- **Empty patient.** Open a patient with no treatments — confirm empty-state
  message ("No treatments recorded yet").
- **In-progress visit.** Open a patient with an unfinished visit — confirm
  "Consultation in progress" banner with Resume button.
- **Duplicate mobile.** Try to register a new patient with mobile `9999999999`
  (or any existing mobile) — confirm warning appears below the field.
- **Archive flow.** From Records page → ⋯ menu → Archive — confirm banner
  appears + patient excluded from consultation search.
- **Show archived toggle.** Patient list → confirm toggle appears (if any
  archived) and filters work.
- **Click behavior.** Confirm patient row click goes to Records (not
  consultation). Confirm "Start consultation" button still works for active
  rows.

### 4. Archive ORK-044
After verifying #3 works, run `archive-ork-044.sql` in Supabase SQL Editor.

### 5. Deploy
```bash
git add -A
git commit -m "Push #2C: Records view + archive + duplicate-mobile warning"
git push
```

Watch Vercel build. Build runs `prisma migrate deploy` automatically.

### 6. Production check
- Open one of Dr. Shobhna's real patients with treatment history → confirm
  Records view renders with proper nesting.
- Confirm financial summary shows reasonable numbers (estimate/invoiced/
  collected/pending).
- Confirm ORK-044 shows as archived (only with "Show archived" toggled).

## Rollback
Vercel Dashboard → Deployments → previous → Promote. The `archivedAt` column
stays in DB harmlessly. To remove fully:
```sql
ALTER TABLE "Patient" DROP COLUMN IF EXISTS "archivedAt";
DROP INDEX IF EXISTS "Patient_clinicId_archivedAt_idx";
```

## Known gaps (Push #3 will address)
- Sittings unrelated to a treatment item can't be recorded today (e.g.
  consultation fee + OTC inventory sale with no treatment plan).
- Treatment.estimate is set at consent time; if Dr. Shobhna adjusts the price
  later, the Records page reflects the new estimate but doesn't keep history of
  the change. Need an audit/edit log for this.
- Per-treatment "paid" is computed from sittings; doesn't include allocations
  from standalone receipts. Acceptable for now since standalone-receipt
  allocation isn't actively used.
