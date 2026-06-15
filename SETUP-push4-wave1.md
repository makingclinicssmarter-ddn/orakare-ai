# Push #4 — First Wave

Real-use feedback from Dr. Shobhna's first full morning of OraKare in production.
8 small but important fixes. No schema changes.

## What's in this push

### 1. Dashboard cleanup
- **Overdue Patients** stat card removed
- **Overdue Patients** panel removed
- **New patient** quick-action removed
- **Add expense** quick-action removed
- Stat cards: 4-column → 3-column
- Quick actions: 5 buttons → 3 buttons (Book appointment, Send follow-up, Seek review)
- Dashboard is now a **data review surface**, not an action launcher

File: `components/dashboard/DashboardView.js`

### 2. Edit patient details
- **NEW button** on Records page header next to the ⋯ menu: "Edit"
- Opens a modal to edit: name, mobile, age, gender, address, email
- **ORK-ID, createdAt, clinic, doctor are NOT editable** — they define identity
- Saves via new `PATCH /api/patients/[id]` endpoint
- All historical visits, treatments, invoices, sittings stay linked to the same patient — no duplicates

Files:
- `app/api/patients/[id]/route.js` (NEW)
- `components/patients/EditPatientButton.js` (NEW)
- `app/dashboard/patients/[id]/page.js` (wires button into header)

### 3. Remove "Current medication" from History screen
- Entire medications block removed from History form
- Field is still in the DB schema (legacy compat) — saved as empty array

File: `components/patients/MedicalHistoryForm.js`

### 4. Per-unit discount on inventory items
- Inventory picker column relabelled: "Discount" → "Disc / unit"
- Net calculation now: `qty × (unitPrice − discPerUnit)` (was `qty × unitPrice − flatDisc`)
- So 3 mouthwashes × ₹50 with ₹10/bottle discount = 3 × (50−10) = **₹120** (was ₹140)
- Close-visit POST endpoint updated to multiply line discount by quantity before persisting

Files:
- `components/consultation/InventoryPicker.js`
- `app/api/consultation/visit/[visitId]/close/route.js`

### 5. Sub-totals in relevant sections of Close screen
- Visit charges table has a "Visit charges sub-total" footer row
- Inventory table has an "Inventory sub-total" footer row
- The existing grand-total summary card still shows combined total

Files:
- `components/consultation/ChargesPanel.js`
- `components/consultation/InventoryPicker.js`

### 6. Mark treatment complete from Close-visit screen
- **NEW section** above the "Save & close visit" button: "Mark treatment complete"
- Each active treatment listed with a checkbox
- Ticking saves the treatment as COMPLETED in the same transaction
- Appends "[Completed <date> at visit close]" to Treatment.notes
- Saves the navigation trip to Treatments tab

Files:
- `components/consultation/CloseVisitScreen.js`
- `app/api/consultation/visit/[visitId]/close/route.js`

### 7. Hide credits from Balance Dues page
- Credit balances section removed from `/dashboard/balance`
- Credits still visible inside each treatment card on patient Records page (when relevant)

File: `app/dashboard/balance/page.js`

### 8. Record payment against an existing invoice (the urgent one)
- **NEW button** on every invoice card with outstanding balance: "Record payment"
- Opens a modal with: amount, mode, date received, note (optional)
- Creates a Receipt linked to the invoice, updates `Invoice.paid`/`balance`/`status`
- Handles the case where Dr. Shobhna forgets to enter payment at visit close
- Receipt is dated to entry-time (or supplied date), NOT backdated to the invoice date
- Validates: amount > 0, amount ≤ outstanding balance, invoice belongs to this clinic
- Invoice card now also shows "Outstanding: ₹X" prominently when there are dues

Files:
- `app/api/invoices/[invoiceId]/record-payment/route.js` (NEW)
- `components/invoice/RecordPaymentButton.js` (NEW)
- `app/dashboard/patients/[id]/page.js` (wires button into invoice cards)

## Files in this zip

```
NEW endpoints:
  app/api/patients/[id]/route.js
  app/api/invoices/[invoiceId]/record-payment/route.js

NEW components:
  components/patients/EditPatientButton.js
  components/invoice/RecordPaymentButton.js

MODIFIED endpoints:
  app/api/consultation/visit/[visitId]/close/route.js

MODIFIED components:
  components/dashboard/DashboardView.js
  components/patients/MedicalHistoryForm.js
  components/consultation/CloseVisitScreen.js
  components/consultation/InventoryPicker.js
  components/consultation/ChargesPanel.js

MODIFIED pages:
  app/dashboard/balance/page.js
  app/dashboard/patients/[id]/page.js
```

12 files. No schema migration.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push4-wave1/. .
git status
```

Should show 12 modified/new files.

```bash
npm run dev
```

## Smoke tests — walk through each fix

### Test 1 — Dashboard cleanup
- Open `/dashboard`
- Top should show **3 stat cards** (This month / Total patients / Balance pending). NO Overdue card.
- Top treatments chart is full-width. NO Overdue panel beside it.
- Quick actions row has **3 buttons** (Book appointment / Send follow-up / Seek review). NO New patient or Add expense.
- Alerts at top should not include "X patients not seen in 30+ days".

### Test 2 — Edit patient
- Open any patient's Records page
- Top-right shows an "Edit" button next to ⋯
- Click → modal opens with current values pre-filled
- Change mobile (e.g. add a digit), save
- Modal closes, page refreshes, new mobile shown in header
- ORK-ID stays the same (not changeable in the modal)
- Verify in SQL:
```sql
SELECT id, "originalID", mobile FROM "Patient" WHERE id = '<id>';
```

### Test 3 — History without Current medications
- Start a new consultation on any patient
- History screen no longer shows the "Current medications" section
- Save the history normally — works fine

### Test 4 — Per-unit discount
- Start consultation → Close-visit screen
- Add an inventory item with quantity 3, unit price 50, **Disc / unit = 10**
- Net column should show **₹120** (was ₹140 in the old flat-discount model)
- Inventory sub-total row at bottom shows ₹120

### Test 5 — Sub-totals
- Same Close-visit screen
- Visit charges table footer: "Visit charges sub-total" with sum of net amounts
- Inventory table footer: "Inventory sub-total" with sum of net amounts
- Grand-total summary card below shows the combined number (unchanged)

### Test 6 — Mark complete on Close
- Start consultation through to Close on a TREATED visit with at least one active treatment
- New section visible above Save button: "Mark treatment complete"
- Tick the checkbox for one treatment
- Caption near Save reflects: "...marks 1 treatment complete..."
- Save & close
- Records page: that treatment now shows status COMPLETED
- Treatment.notes contains "[Completed <date> at visit close]"
- Treatments tab → treatment no longer in Active filter, visible in Completed filter

### Test 7 — Hide credits from balance dues
- Open `/dashboard/balance`
- Should NOT see "Credit balances" section anywhere
- The patient list shows only positive dues, no credits
- Open a specific patient where one treatment has credit (paid > estimate)
- That treatment's card still shows the credit (so financial reality is still visible at treatment level)

### Test 8 — Record payment (the urgent fix)
- Find the patient where you forgot to enter visit-charge payment (or create one for testing: close a visit with charges but 0 payment, leaving an outstanding balance)
- Open patient's Records page → Other activity → invoice card
- Card shows "Outstanding: ₹X" in red
- Card has a "Record payment" button (indigo bordered)
- Click → modal opens, amount pre-filled with full outstanding
- Adjust if partial. Set mode (Cash/UPI/Card). Set date (defaults today).
- Click "Record ₹X"
- Modal closes, page refreshes
- Invoice balance goes to ₹0 (or partial)
- Outstanding label disappears (or shows reduced amount)
- Verify in SQL:
```sql
SELECT id, "invoiceNo", total, paid, balance, status FROM "Invoice" WHERE id = '<id>';
SELECT id, amount, "paymentMode", "invoiceId", notes FROM "Receipt" ORDER BY "createdAt" DESC LIMIT 1;
```

## Push to production

After all 8 tests pass:

```bash
git add -A
git commit -m "Push #4 wave 1: dashboard cleanup + patient edit + per-unit disc + subtotals + mark-complete-on-close + credit hide + record-payment"
git push
```

## What's still pending

### Push #4 wave 2 (next iteration)
- Examination layout redesign: Clinical Findings → Radiographical Findings → AI Findings → Dental Chart
- General + Radiographical examination as separate sections in the data model

### Open / unresolved
- Edit saved sitting (item 7 from original list) — DEFERRED. Dr. Shobhna will tell us specifically what kind of edit she needs first.
- The one stuck patient with the forgotten payment — if you ran the SQL fix tonight, no action needed. If not, use the new "Record payment" button after this deploys.

## What Dr. Shobhna sees changing

Tell her:
- **Dashboard:** cleaner, just data. New patients and expenses still happen via the dedicated sidebar tabs.
- **Edit patient:** new "Edit" button on patient page. Fix typos without losing history.
- **History form:** medications removed (she rarely uses).
- **Close-visit screen:** discount is now per-unit on inventory (matches what she expects); sub-totals visible per section; tick boxes above Save to mark treatments complete in one step.
- **Balance dues page:** no more credit clutter.
- **Invoice with outstanding:** click "Record payment" if she forgot to enter payment at close.
