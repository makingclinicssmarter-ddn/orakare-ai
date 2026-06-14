# Push #3.5 — Zip 2.1 (fixes from Zip 2 testing)

Three issues caught during Zip 2 smoke tests. This zip fixes all three.

## Fixes

### A. Return-for-sitting failed for treatments without a TreatmentItem

**Problem:** Some treatments (likely imports, or those created via an older
code path) have no linked TreatmentItem. The return-for-sitting endpoint
hard-failed with "Treatment has no TreatmentItem (cannot attach sitting)".

**Fix:** The endpoint now auto-bootstraps: if `Treatment.treatmentItemId` is
null, it creates a placeholder TreatmentPlan + TreatmentItem (consentStatus
already SIGNED, since this Treatment exists at all) inside the new visit.
Then links Treatment.treatmentItemId to the new TreatmentItem and proceeds.

All in a single transaction. If anything fails, nothing persists.

File: `app/api/treatments/[treatmentId]/sitting/route.js`

### B. Treatment payment auto-allocates to the obvious target

**Problem:** When she typed a treatment payment of ₹2500 and there was a
single active treatment with ₹2500 balance, the system left allocations
at 0 unless she manually typed 2500 into the allocation row. On save,
the payment was stored as unallocated even though the obvious intent was
to pay down THAT treatment.

**Fix:** Two complementary changes:

1. **TreatmentPaymentPanel auto-fills.** When the user types an amount AND
   hasn't checked "Don't allocate" AND no manual allocation is currently
   entered (all rows at 0), the system auto-dumps the entire amount onto
   the first treatment with positive balance. She can still redistribute
   manually before saving.

2. **CloseVisitScreen blocks under-allocation on save.** If she enters
   a treatment payment > 0 and hasn't checked "Don't allocate", the save
   button now refuses unless the allocations sum to the payment amount.
   The error message says: "Only ₹X of ₹Y is allocated. Allocate the
   full amount across treatments, or check 'Don't allocate now' to park it."

Files:
- `components/consultation/TreatmentPaymentPanel.js`
- `components/consultation/CloseVisitScreen.js`

### C. Print prescription slip missing for TREATED visits

**Problem:** "Other activity" section filtered out visits with consented
treatments, so TREATED visits never appeared there and their Print slip
link was unreachable.

**Fix:** Show ALL visits in "Other activity", not just consultation-only
ones. There's some apparent duplication between the Treatments section
(which shows treatments and their sittings) and Other activity (which now
shows the visits themselves), but the visits contain unique info — advice,
next appointment, medications dispensed — that the treatment cards don't
show. So both have a place.

File: `app/dashboard/patients/[id]/page.js`

## Files in this zip

```
MODIFIED:
  app/api/treatments/[treatmentId]/sitting/route.js
  app/dashboard/patients/[id]/page.js
  components/consultation/CloseVisitScreen.js
  components/consultation/TreatmentPaymentPanel.js
```

No schema changes. No new files.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-5-zip21/. .
git status
```

Should show 4 modified files.

```bash
npm run dev
```

## Re-test

### Test A — Return-for-sitting on treatment without TreatmentItem
1. Find a treatment in Treatments tab that previously failed (no sittings yet, fresh active)
2. Click "+ Sitting"
3. Fill in work done
4. Click "Save & close visit →"
5. Should succeed this time
6. Land on Close screen
7. Save with appropriate payment + allocation

Verify:
```sql
-- The treatment now has a treatmentItemId
SELECT id, "treatmentItemId", status FROM "Treatment" WHERE id = '<treatmentId>';
-- A TreatmentItem was created
SELECT id, "procedureName", "consentStatus" FROM "TreatmentItem" WHERE "treatment" = ... ;
-- A new visit exists
SELECT id, status, outcome FROM "Visit" WHERE "patientId" = '<patientId>' ORDER BY "createdAt" DESC LIMIT 1;
-- The sitting attached
SELECT id, description, date FROM "Sitting" ORDER BY "createdAt" DESC LIMIT 1;
```

### Test B — Auto-allocation
1. From Treatments tab, "+ Sitting" on a treatment with balance > 0
2. Save sitting, land on Close screen
3. Section 2 should show that ONE active treatment with current paid + balance
4. Type ₹2500 in the "Amount received" field
5. **Allocation should auto-fill ₹2500 in the row for that treatment**
6. Status box should turn green "✓ Fully allocated"
7. Click Save & close
8. Verify: Receipt has PaymentAllocation row of ₹2500 tied to the treatment
9. Records page: treatment balance dropped by ₹2500

### Test B2 — Auto-allocation with multiple treatments
1. Find a patient with 2+ active treatments
2. Start a return-for-sitting flow on one of them
3. On Close screen, Section 2 shows both active treatments
4. Type ₹1000 payment
5. ₹1000 should auto-fill onto the first treatment with positive balance
6. **Verify she can manually move it to a different treatment** by editing the rows
7. Save — verify allocations match what's in the UI

### Test B3 — Underallocation block
1. On Close screen, type payment ₹2000
2. Auto-fill puts ₹2000 onto one treatment
3. **Manually clear that allocation back to 0**
4. Try to click "Save & close visit"
5. Should see red error: "Only ₹0 of ₹2000 is allocated. Allocate the full amount across treatments, or check 'Don't allocate now' to park it."
6. Either fix the allocation OR check "Don't allocate now" → save then works

### Test C — Print prescription slip on TREATED visits
1. Open a patient with a TREATED visit (e.g. ORK-058)
2. Scroll to "Other activity" section
3. **The TREATED visit should now appear there** as a card
4. Card has "Print prescription slip →" link
5. Click → slip opens in new tab, printable

## Deploy to production

```bash
git add -A
git commit -m "Push #3.5 Zip 2.1: auto-bootstrap TreatmentItem + auto-allocate payment + Print slip on all visits"
git push
```

## What's complete after Zip 2.1

The entirety of Push #3.5. After Vercel deploys this, Dr. Shobhna has:
- Full branching consultation outcomes
- Dual-payment Close screen with smart auto-allocation
- Treatments tab + per-treatment detail
- Return-for-sitting (works even for treatments missing TreatmentItem)
- Mark complete with notes
- Prescription slip print (reachable from every closed visit)
- Apply unallocated
- Two-stream financial reporting

## Push #4 territory (deferred)

- General + Radiographical examination separation
- Examination layout redesign
- Edit/delete closed visits, sittings, treatments
- AI clinical notes drafting
- Patient-facing visual explainer
- WhatsApp integration
- Backfill historical sitting.paid → Receipt+PaymentAllocation
