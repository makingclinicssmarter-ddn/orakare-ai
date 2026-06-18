# Push #7 — Invoice & Treatment Payment Fixes

Four corrections to the Close-visit screen and treatment payment workflow,
all from Dr. Shobhna's real use.

## What this fixes

### Fix 1 — Correct combined visit charges total (calculation bug)

**Bug:** The per-unit discount on inventory items was being summed as flat values,
making the "Total" wrong. E.g. 3 mouthwashes × ₹110 with ₹10/unit disc showed ₹320
(should be ₹300).

**Fix:** Rewrote `vcTotals` to compute correctly:
- `chargesNet` = sum of (amount − discount) per charge row
- `invNet` = sum of (qty × (unitPrice − discPerUnit)) per inventory row
- `grand` = chargesNet + invNet

The display now shows two clean sub-totals + a clear total:
- "Visit charges" sub-total
- "Materials & medicines" sub-total
- "Total"

No more confusing "Subtotal − Discount" line — discounts already apply at line level.

### Fix 2 — Removed misleading "Total discount" field

**Bug:** A "Total discount" field existed alongside per-line discounts. She entered
the total discount thinking it was the only place, but the line discounts also
existed, causing discount to be applied twice.

**Fix:** "Total discount" input removed entirely.

### Fix 3 — Round-off mechanism via inline charge line

**Replaces the removed "Total discount"** for the legitimate use case of round-offs
(₹823 → ₹800 etc.).

**Fix:** New "+ Add round off line" button. Clicking adds a new row in the Visit
charges table labeled "Round off" with editable amount. She can enter a negative
amount (e.g. −23) to subtract. Transparent, audit-friendly — appears as an actual
line on the invoice.

Charges table now accepts negative amounts. The close API correctly nets out
negative lines in the total.

### Fix 4 — Treatment discount at collection time, not plan time

**Bug:** Treatment estimates had no discount field exposed in UI. When she wanted
to give a discount on a treatment (e.g. ₹500 off for a regular patient at time of
payment), no UI path existed.

**Fix:** Two surfaces now accept a per-treatment discount:

1. **Close-visit screen → Treatment payment section** — new "Discount today" column
   in the allocation table. Entered per row. Adds to `Treatment.discount` additively.

2. **"Record payment" modal on treatment cards** (Push #6 expansion) — new
   "Discount given" input alongside "Amount received". She can record:
   - Payment only (existing behavior)
   - Discount only (write-off, no payment today)
   - Both at once (e.g. patient pays ₹800, doctor writes off ₹200)

Each discount entry ADDS to `Treatment.discount` (accumulative). Doesn't replace.

### Fix 5 — Per-treatment statement printout

**Bug:** No print path for treatment payments. Receipts existed in DB but patient
couldn't get paper.

**Fix:** New `/api/treatments/[id]/statement` HTML route. Renders a full per-
treatment statement:
- Header: clinic info, status badge (PLANNED / IN_PROGRESS / COMPLETED)
- Patient + treatment details
- Sittings recorded (if any)
- Payments received — chronological table with running balance
- Totals: Estimate − Discount = Net amount, Total paid, Balance due

New "Print statement" button on each treatment card in Records page. Opens in new tab.

## Files

```
MODIFIED endpoints:
  app/api/consultation/visit/[visitId]/close/route.js          (totalDiscount removed, per-treatment disc, negative amounts)
  app/api/treatments/[treatmentId]/record-payment/route.js     (accepts discount, allows discount-only)

NEW endpoint:
  app/api/treatments/[treatmentId]/statement/route.js          (treatment statement HTML)

MODIFIED components:
  components/consultation/CloseVisitScreen.js                  (totals math, round-off button, removed Total disc)
  components/consultation/ChargesPanel.js                      (negative amounts allowed for round-off)
  components/consultation/InventoryPicker.js                   (renamed "Inventory" → "Materials & medicines")
  components/consultation/TreatmentPaymentPanel.js             (new Discount column)
  components/treatments/RecordTreatmentPaymentButton.js        (new Discount input)

MODIFIED pages:
  app/dashboard/patients/[id]/page.js                          (Print statement link in treatment action row)
```

9 files. No schema changes. No migration. Pure code update.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push7/. .
git status
```

Should show 9 modified/new files.

```bash
npm run dev
```

No migration needed — `Treatment.discount` already exists in schema.

## Smoke tests

### Test 1 — Combined visit charges total now correct
1. Start a consultation → reach Close visit
2. Add a charge row: "X-ray" ₹400, discount 0 → Net ₹400
3. Add a material: "Mouthwash" qty 3, unit ₹110, disc/unit ₹10 → Net ₹300
4. Verify the totals block at the bottom:
   - Visit charges: ₹400
   - Materials & medicines: ₹300
   - Total: ₹700
5. NOT ₹730 (the old bug)

### Test 2 — Round-off line
1. Same screen, click "+ Add round off line"
2. A new row appears in Visit charges table labeled "Round off"
3. Enter amount: −23
4. Net column shows −₹23
5. Visit charges sub-total: 400 − 23 = ₹377
6. Total: 377 + 300 = ₹677
7. Save & close → invoice in DB reflects this; invoice has a line item "Round off" with total −23

### Test 3 — Treatment discount on Close screen
1. Patient has IN_PROGRESS treatment with balance ₹4000
2. Close screen → Treatment payment section
3. Enter ₹2000 in Amount received
4. In the allocation table, on that treatment row:
   - Enter Discount today: 500
   - Enter Allocate today: 2000
5. Balance column shows "₹4000 → ₹3500 after disc" hint
6. Save & close visit
7. Verify in SQL:
```sql
SELECT id, estimate, discount FROM "Treatment" WHERE id = '<id>';
```
   `discount` should have increased by 500.
8. Records page → that treatment now shows new balance = ₹4000 − ₹500 − ₹2000 = ₹1500

### Test 4 — Record payment with discount
1. Find a treatment with balance ₹3000
2. Click "Record payment" on the card
3. Modal opens. Enter Amount received: 2000, Discount given: 200
4. Below the inputs: "After this, ₹800 will remain outstanding"
5. Save button: "Record ₹2000 + ₹200 disc"
6. Save → page refreshes
7. Treatment card now shows estimate minus accumulated discount, balance ₹800

### Test 5 — Discount-only entry (write-off)
1. Treatment with balance ₹1000
2. Click "Record payment" → Modal
3. Enter Amount: 0, Discount: 1000
4. Save button: "Apply ₹1000 discount"
5. Save → treatment shows fully settled (balance ₹0), no new Receipt row created

### Test 6 — Print treatment statement
1. On any treatment card, click "Print statement"
2. New tab opens with a printable statement showing:
   - Patient + treatment header
   - Sittings list (if any)
   - Chronological payments table with running balance
   - Totals: Estimate − Discount = Net, Total paid, Balance
3. Click "Print statement" button at top → browser print dialog opens

### Test 7 — Edge case: combined exceeds balance
1. Treatment with balance ₹1000
2. Record payment modal → Amount 800, Discount 500
3. Error appears: "Amount + discount (₹1300) exceeds outstanding ₹1000"
4. Save button stays enabled; she fixes and tries again

## Push to production

```bash
git add -A
git commit -m "Push #7: Visit charges math fix, per-treatment discount at collection, round-off, treatment statement print"
git push
```

## What's still ahead

Already shipped / queued:
- Push #5 sitting corrections (independent zip, ready to deploy)
- Push #5 batch-based inventory (independent zip, ready to deploy)
- Push #6 treatment workflow fixes (ready to deploy)
- Push #7 this zip (ready to deploy)

Push order recommendation: Push #6 first, then this Push #7 (it builds on Push #6's RecordTreatmentPaymentButton), then sitting corrections, then inventory.

## What Dr. Shobhna will see

Tell her:
- Visit charges total is now correct
- "Inventory dispensed" is now called "Materials & medicines"
- "Total discount" field is gone — just enter discount per line as before
- For round-offs (₹823 → ₹800), click "+ Add round off line" and enter a negative amount
- Treatment discount can now be entered at collection time:
  - On Close-visit screen → Treatment payment section has a new Discount column
  - On Record payment modal (on treatment cards) → new Discount field
- New "Print statement" button on every treatment card → opens a printable statement for the patient
