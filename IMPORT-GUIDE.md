# Historical data import — operating guide

This is a **destructive, single-purpose** script that wipes ALL transactional
data for a clinic and re-imports it from the 7 Google Sheets CSVs. Patient
demographic rows are preserved and matched by `originalID`.

## When to run this

- One-time, when migrating a clinic from their previous Google Sheets PMS
- Re-run safely after fixing source CSV data (wipe-then-import is idempotent)

## Prerequisites

The script uses dependencies that should already be in your `package.json`:
- `@prisma/client`
- `papaparse`
- `dotenv`

If `dotenv` is missing, install it:

```bash
npm install dotenv
```

`papaparse` should already be present (used elsewhere in the project).

## Step 1 — Export CSVs from Google Sheets

In the source spreadsheet, for each of these worksheets, File → Download → CSV:
- Patients
- Treatments
- Sittings
- Invoices
- Inventory
- Expenses
- Consultants

Save them to `scripts/csv-imports/` in your project root. Filenames must match
exactly (e.g. `Patients.csv`).

## Step 2 — Confirm clinic + doctor target in the script

Open `scripts/import-historical-data.js` and verify the constants at the top:

```js
const CLINIC_ID = '...'   // Dr. Shobhna Bansal Orakare Dental Clinic
const DOCTOR_ID = '...'   // Dr. Shobhna Bansal
```

These are baked in for safety — to import a different clinic's data, you'd
change these explicitly. No risk of accidentally wiping the wrong clinic.

## Step 3 — Dry-run

```bash
node scripts/import-historical-data.js
```

This walks the entire import inside a transaction and **rolls back** at the
end. Database is not modified. You'll see a summary like:

```
═══ Phase 0: loading CSVs from /repo/scripts/csv-imports
  Patients:    44 rows
  Treatments:  88 rows
  ...
═══ Phase 1: wipe ... (counts shown)
═══ Phase 2-6: import phases ...
═══ Phase 8: verification
  After import:
    visits:     88
    treatments: 88
    sittings:   139
    ...
═══ DRY-RUN — rolling back.
```

**Read the dry-run output carefully.** Specifically check:
- Treatment skip count (should be 0 — non-zero means a patient ID didn't match)
- Sittings count matches CSV
- "After import" counts match what you expect
- Total collected matches what Dr. Shobhna remembers

## Step 4 — Backup

Before committing:

```bash
# In Supabase Dashboard → Database → Backups → confirm a recent backup exists
# Or take a manual one if you have a paid tier
```

## Step 5 — Commit the import

```bash
node scripts/import-historical-data.js --commit
```

Same script, but the final `throw '__DRY_RUN_ROLLBACK__'` is skipped. The
transaction commits at the end.

You'll see `═══ ✓ IMPORT COMMITTED` if all went well. If anything failed
mid-way, the transaction rolls back fully — no partial state possible.

## Step 6 — Verify in the app

1. Open `/dashboard/patients` — patient list should still show 44 active.
2. Click into a patient with treatment history (try ORK-001 Karan Gupta or
   ORK-004 Neeru Khanna who have rich data).
3. Confirm:
   - Treatments section shows with proper status badges
   - Each treatment expands to show its sittings with date / done / prescription /
     consumables / payment
   - Financial summary shows non-zero "Treatments estimate" and "Collected"
   - Pending dues or credit balance computes sensibly

## Rollback (if the result is wrong)

The script wipes data on every run, so to "rollback":

1. **Best**: Restore from Supabase backup taken in Step 4.
2. **Alternative**: Fix the CSV source data or the script logic, then re-run
   the script with `--commit`. It wipes again and re-imports.

## What gets wiped vs preserved

**Wiped** (for clinic `cmpyguilj00007wnzp5xnvy7j` only):
- All Visit rows + their MedicalHistory/ExamConsent/ClinicalFindings/Diagnosis/
  ClinicalRecord/Communication children
- All TreatmentPlan, TreatmentItem, Treatment rows
- All Sitting rows
- All Receipt + PaymentAllocation rows
- All Invoice + InvoiceItem rows
- All FeeEntry rows
- All FollowUp rows
- All Expense rows
- All InventoryItem rows
- All Consultant rows
- All ClinicCounter rows (recomputed during import)

**Preserved**:
- Clinic row
- Doctor row(s) — including their Clerk linkage
- All Patient rows + their `originalID`, `archivedAt`, etc.

## Known limitations

- Treatments with no `Started At` get `createdAt` set to current time on the
  synthetic Visit. The treatment.startedAt itself stays null. Affects ~3 rows.
- Consumables free-text is parsed into structured JSON `[{name, qty, price}]`.
  Strings that don't match the expected `Item x1=Rs 300` pattern become a
  single entry with name = full text. Verify a few in the Records page.
- ExamConsent rows are NOT created for synthetic visits (the current consultation
  flow doesn't use ExamConsent any more).
