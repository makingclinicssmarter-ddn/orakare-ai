# Push #6 — Treatment Workflow Fixes

Three small but important fixes surfaced from Dr. Shobhna's actual use today.

## What's fixed

### Fix A — "Start sitting" button on Records page treatment cards

Previously: she had to navigate Records → Treatments tab → click treatment → Treatment detail page → "Add sitting" button. Three levels deep. She missed it and accidentally created a new treatment instead.

Now: every active (PLANNED or IN_PROGRESS) treatment card on the Records page has a "+ Start sitting" button right in the expanded card. One click, lands on the existing return-for-sitting form.

No new endpoint — just better UI discoverability.

### Fix B — "Record payment" on treatment with dues (including COMPLETED)

Previously: if a treatment had outstanding balance, the only way to record a payment was:
- During a new visit's Close screen (treatment payment section)
- Via "Apply Unallocated" (but only if there was an unallocated receipt)

If the patient said "I'll pay next week," there was no way to record that payment when they paid. Stuck.

Now: every treatment card with `balance > 0` shows a "Record payment" button. Works for IN_PROGRESS, PLANNED, AND COMPLETED treatments. Completion stamp does NOT lock financials.

Modal: amount (pre-filled with full outstanding), mode, date, optional note. Creates a Receipt + PaymentAllocation linked to the treatment.

Validates: amount > 0, amount <= outstanding balance.

### Fix C — Edit estimate on a treatment

Previously: treatment estimate set at creation, no way to change it. If she re-diagnosed and the actual cost differed (e.g. ₹6000 → ₹4000), no way to update.

Now: tiny "edit" link next to the estimate amount on each treatment card. Opens a modal: shows current estimate, already paid amount, lets her enter new estimate, previews new balance. Saves immediately.

Works for treatments in ANY status — including COMPLETED.

Balance recomputes automatically from estimate − discount − allocations.
No audit log on the edit (per your call — estimates are estimates).

## Files

```
NEW endpoints:
  app/api/treatments/[treatmentId]/record-payment/route.js

MODIFIED endpoints:
  app/api/treatments/[treatmentId]/route.js   (adds PATCH for estimate edit)

NEW components:
  components/treatments/RecordTreatmentPaymentButton.js
  components/treatments/EditEstimateButton.js

MODIFIED pages:
  app/dashboard/patients/[id]/page.js   (wires all 3 buttons into treatment cards)
```

5 files. No schema changes. No migration.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push6/. .
git status
```

Should show 5 modified/new files.

```bash
npm run dev
```

## Smoke tests

### Test A — Start sitting from Records page
1. Open a patient who has an IN_PROGRESS treatment
2. Records page → Treatments section → expand the treatment card
3. Should see "+ Start sitting" button at the bottom-right
4. Click → lands on /dashboard/treatments/<id>/sitting
5. Fill in date + description → save → returns to treatment, new sitting visible

### Test B1 — Record payment on COMPLETED treatment
1. Find a COMPLETED treatment with outstanding balance (e.g. today's ₹2000 treatment)
2. Records page → expand it → action row shows "Record payment" button
3. Click → modal: amount pre-filled with ₹2000, mode Cash, date today
4. Save → page refreshes
5. Balance now shows ₹0, treatment fully paid
6. Verify in SQL:
```sql
SELECT id, amount, "paymentMode", notes FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 1;
SELECT * FROM "PaymentAllocation" ORDER BY "createdAt" DESC LIMIT 1;
```
Receipt: amount 2000, note "Treatment payment — <type> <area>". PaymentAllocation: receiptId + treatmentId + 2000.

### Test B2 — Partial payment
1. Find a treatment with outstanding ₹4000
2. Click Record payment → enter ₹2000 → save
3. Inline preview should show "After this, ₹2000 will remain outstanding"
4. Save → balance is now ₹2000 (still showing red)
5. Click Record payment again → enter remaining ₹2000 → save → balance now ₹0

### Test B3 — Reject overpayment
1. Treatment with ₹2000 balance
2. Try to record ₹3000
3. Should fail with error mentioning the outstanding limit

### Test C — Edit estimate
1. Find treatment with estimate ₹6000, ₹0 paid so far
2. Click "edit" next to the ₹6000 amount
3. Modal opens — shows current estimate ₹6000, already paid ₹0
4. Enter ₹4000 in New estimate → preview shows "Estimate goes down" + "New balance will be ₹4000"
5. Click "Update estimate"
6. Treatment card shows ₹4000 now, balance is ₹4000
7. Verify in SQL:
```sql
SELECT id, estimate, discount FROM "Treatment" WHERE id = '<id>';
```

### Test C edge case — Estimate goes below already-paid
1. Treatment with estimate ₹6000, already paid ₹5000
2. Click edit → enter ₹4000
3. Preview shows red warning: "Patient has paid more than this new estimate. May be entitled to a refund — handle separately."
4. Still allows save (we don't block — refunds happen outside the app)
5. After save, balance is ₹0 (can't go below zero on display)
6. Note: the credit (₹1000) will show up if she opens that specific treatment — credit balances stay at treatment-level only, per Push #4

## Resolve today's actual situation

After deploy, for the patient she mentioned:

1. Open the patient's Records page
2. Find the ₹6000 treatment from yesterday
3. Click "edit" next to the estimate → change to ₹4000 → save
4. The new ₹2000 treatment created today is the second part — leave as is
5. When the patient comes back to pay the ₹2000 → click "Record payment" on that treatment → enter ₹2000 → save

Everything resolves through the UI now. No SQL needed.

## Push to production

```bash
git add -A
git commit -m "Push #6: Start sitting on Records page + Record treatment payment + Edit estimate"
git push
```

## What's still ahead

Already shipped or queued:
- Push #5 sitting corrections (small zip — deploy when ready)
- Push #5 batch-based inventory (substantial zip — deploy after sitting corrections is stable)

Future:
- WhatsApp integration (Push #7 candidate — biggest India-specific wedge)
- Online payment integration (Razorpay)
- Multi-doctor / multi-chair (unlocks larger clinic targets per Path C plan)
