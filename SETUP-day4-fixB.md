# Push #3 Day 4 Fix B + ExaminationView grid restore

## What this delivers

Fixes the two issues from Day 4 testing:

**1. Grid regression on Examination screen** — restored `min-[1600px]:grid-cols-2`
(Push #2B fix). Dental chart and AI panel stack vertically below 1600px.

**2. Cross-visit collection bug** — the Records page financial summary now
splits into TWO independent sections:
- **Treatments** — estimate, treatment payments, treatment balance
- **Visit charges** — Close-visit invoiced, visit-charge payments, balance

This prevents Visit 1's consultation/X-ray payment from incorrectly counting
against Visit 2's treatment estimate.

## Files

```
NEW:
  lib/finance.js   — shared per-patient finance computation helper

MODIFIED:
  components/patients/ExaminationView.js          (restore min-[1600px] grid)
  app/dashboard/patients/[id]/page.js             (two financial sections + helper)
  app/dashboard/balance/page.js                   (helper, tx + visit columns)
  app/dashboard/page.js                           (helper for totals)
```

## How the math is now consistent across surfaces

The `computePatientFinances(patient)` helper in `lib/finance.js` is the single
source of truth. It takes a patient with included `treatments`, `receipts`
(with `allocations`), and `invoices`, and returns:

- `treatment`: { estimate, collected, balance, credit }
- `visitCharges`: { invoiced, collected, balance }
- `totalBalance`: treatment.balance + visitCharges.balance

Used by:
- Records page → renders the two sections directly
- Balance page → builds the per-patient table
- Dashboard → sums `totalBalance` across all patients for the "Balance pending" card

Same input shape, same logic, same numbers everywhere.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-day4-fixB/. .
git status
```

You'll see: 1 new file (`lib/finance.js`), 4 modified files.

```bash
npm run dev
```

## Local smoke tests

1. **Examination layout** — open any patient's examination screen. The dental
   chart and AI panel should be stacked vertically (not side by side) on your
   laptop. Same as before Day 4 deployed.

2. **Reproduce the original bug** — Pick the patient from your earlier test.
   Open Records page. You should now see TWO financial sections:
   - "Treatments" with the ₹3500 estimate, treatment payments, balance
   - "Visit charges" with the previous consultation+X-ray+mouthwash invoice and payment
   - The two are clean of each other. The Visit 1 payment no longer reduces
     the Visit 2 treatment balance.

3. **Dashboard total** — open `/dashboard`. The "Balance pending" card now
   shows the sum of (treatment balance + visit charges balance) across all
   patients. Click it → balance page shows per-patient breakdown with both
   columns.

4. **Sanity check on patients with no Close-visit invoices yet** — open
   ORK-001 (Karan Gupta). Should show only the Treatments section (no Visit
   charges section since he has no Close-visit invoices). All numbers same
   as before.

## Deploy to production

```bash
git add -A
git commit -m "Push #3 fix: two-stream finances + restore examination grid"
git push
```

## What's still pending after this

**Day 5:** Prescription slip print template.

**Push #4 territory:**
- General + Radiographical examination as separate sections (Dr. Shobhna's
  3rd observation today). This is a clinical-data redesign, not a finance
  bug. Defer until after Day 5.
- Return-for-sitting flow (visits that skip History on follow-ups)
- Edit/delete past sittings
- AI clinical notes drafting
