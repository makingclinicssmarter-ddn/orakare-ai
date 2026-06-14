# Push #3.5 — Zip 1 of 2

## What this zip delivers

The financial model fix + dual-payment Close screen + treatment lifecycle.
**Ships the bug fixes first**, before adding the new Treatments tab features
(which come in Zip 2).

After Zip 1 deploys, Dr. Shobhna can:
- Close a TREATED visit with two clearly-separated payment streams
- Take payment for visit charges (consultation, X-ray, dispensed items) — always paid in full
- Take payment for treatment (toward running treatments) — partial OK, with manual allocation per treatment, or parked as unallocated
- See Records page show two cleanly-separated financial sections that don't conflate
- See Treatment.status correctly transition PLANNED → IN_PROGRESS when first sitting starts

Still pending (Zip 2):
- Treatments tab in sidebar (global active treatments list)
- Per-treatment detail page with "+ Sitting" and "Mark complete" buttons
- Return-for-sitting screen
- Prescription slip print template
- "Apply unallocated" UI on patient records page

## Files

```
Schema:
  prisma/schema.prisma                                       — adds Invoice.kind + InvoiceKind enum
  prisma/migrations/20260614040000_..../migration.sql        — additive + backfill

Helpers:
  lib/finance.js                                             — kind-filtered finance computation

Backend:
  app/api/consultation/visit/[visitId]/close/route.js        — dual-payment + allocations + lifecycle

UI:
  app/dashboard/consultation/[patientId]/[visitId]/close/page.js  — fetches active treatments
  components/consultation/CloseVisitScreen.js                — two-section layout
  components/consultation/TreatmentPaymentPanel.js (NEW)     — allocator with don't-allocate
  app/dashboard/patients/[id]/page.js                        — unallocated banner + kind-aware
  app/dashboard/balance/page.js                              — kind in invoices select
  app/dashboard/page.js                                      — kind in invoices select
```

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-5-zip1/. .
git status
```

You should see 1 new migration, 1 modified schema, 1 new component, 6 modified files.

Run migration (local first):

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

The migration adds the `kind` column to Invoice with default `VISIT_CHARGES`,
then backfills `kind=TREATMENT` for all invoices created before 2026-06-13.

## Local smoke tests — all 3 outcomes

### Test 1 — ADVISED (visit charges only)

1. Start a fresh consultation on a test patient
2. Complete History → Save examination → Click "Close visit"
3. Land on Close screen — outcome auto-selected as ADVISED
4. Section 1 visible (Visit charges), Section 2 visible if patient has active treatments
5. Add Consultation preset (₹500), OPG (₹400), one mouthwash from inventory
6. Total discount ₹0, pay ₹1080 Cash
7. Section 2: leave Treatment payment amount at 0
8. Add advice, schedule next appointment
9. Save & close

Verify:
```sql
SELECT outcome, advice, "nextAppointmentDate", status FROM "Visit" WHERE id = '<visit>';
SELECT "invoiceNo", kind, total, paid, balance FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 1;
SELECT amount, "paymentMode", "invoiceId" FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 1;
```
Expected: Visit.status=COMPLETED, outcome=ADVISED. Invoice kind=VISIT_CHARGES. Receipt has invoiceId set.

### Test 2 — TREATED with treatment payment (the important one)

This is the path that exposed yesterday's bug. Verify it's fixed.

1. Start a fresh consultation
2. Complete History → Examination → Proceed to plan → Add a treatment with estimate ₹3500
3. Proceed to consent → Sign consent → Click "Start treatment now"
4. Record a sitting → "Close visit →"
5. Land on Close screen — outcome auto-selected as TREATED
6. Section 1: Add Consultation (₹500), OPG (₹400). Pay ₹900 cash.
7. Section 2: see your just-planned RCT in the table with estimate ₹3500, paid ₹0
8. Enter "Allocate today" = 1000 for that row
9. Set Payment received = ₹1000 Cash
10. Save & close

Verify:
```sql
SELECT "invoiceNo", kind, total, paid FROM "Invoice" ORDER BY "createdAt" DESC LIMIT 2;
-- Expected: one invoice with kind=VISIT_CHARGES, total=900, paid=900

SELECT amount, "paymentMode", "invoiceId" FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 2;
-- Expected: 2 receipts. One ₹900 with invoiceId (visit charges).
--           One ₹1000 with invoiceId=null (treatment payment).

SELECT pa.amount, t.type FROM "PaymentAllocation" pa JOIN "Treatment" t ON t.id = pa."treatmentId"
ORDER BY pa."createdAt" DESC LIMIT 1;
-- Expected: ₹1000 allocated to your test RCT.

SELECT status FROM "Treatment" ORDER BY "createdAt" DESC LIMIT 1;
-- Expected: IN_PROGRESS (was PLANNED before close; auto-transitioned).
```

Now open that patient's Records page:
- **Treatments section** shows: estimate ₹3500, collected ₹1000, balance ₹2500
- **Visit charges section** shows: invoiced ₹900, collected ₹900, balance ₹0
- The two are clean of each other. NO cross-contamination.

### Test 3 — TREATED with "Don't allocate" toggle

1. Same as Test 2 up to step 7
2. Check "Don't allocate now" checkbox
3. Set Payment received = ₹2000 Cash
4. Save & close

Verify:
```sql
SELECT amount, notes FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 1;
-- Expected: ₹2000, notes contain "unallocated"
SELECT COUNT(*) FROM "PaymentAllocation" WHERE "receiptId" = (SELECT id FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 1);
-- Expected: 0
```

Records page should show:
- **Yellow "Unallocated payment: ₹2,000" banner** at the top of the financial summary
- The ₹2000 does NOT appear in Treatments → Collected (correct — it's not allocated)
- The ₹2000 does NOT appear in Visit charges → Collected (correct — no invoiceId)

### Test 4 — Verify no regression on existing data

1. Open ORK-001 Karan Gupta's Records page
2. Should show ONLY the Treatments section (no Visit charges section since he has no kind=VISIT_CHARGES invoices)
3. Financial numbers should match what you saw before

## Deploy to production

After all 4 tests pass locally:

```bash
git add -A
git commit -m "Push #3.5 Zip 1: Invoice.kind + dual-payment Close screen + treatment lifecycle"
git push
```

Vercel deploys. Migration runs during build.

## Known limitations (Zip 2 will address)

- No Treatments tab in sidebar yet — Dr. Shobhna can't browse her active
  treatments from one place. Active treatments table on the Close screen only.
- No "+ Sitting" button on existing treatments yet (return-for-sitting flow).
  If she needs to add sitting #2 to an existing treatment, she has to start
  a new consultation, which forces History/Exam/Plan/Consent first.
- No "Mark complete" button on treatments yet.
- No "Apply unallocated" UI — unallocated payments show on Records page banner
  but she can't yet click to allocate. (DB can be updated manually meanwhile.)
- No prescription slip print template.

If Dr. Shobhna runs into the return-for-sitting limitation in real use over
the next day, that pushes Zip 2's urgency.

## OKR-2026-0010 cleanup

After deploying, you'll re-test and delete the misclassified test patient.
Don't manually clean OKR-2026-0010 now — let your test cycle clean it
naturally when you re-test the flow on a fresh patient.
