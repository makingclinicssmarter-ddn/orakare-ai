# Push #3.5 — Zip 1.5 (polish + cleanup)

Drops in on top of Zip 1. **Six files modified, zero new files.**

## What this delivers

### 1. "Start consultation" buttons removed (resolves cross-visit confusion)
- `components/patients/PatientHistoryActions.js` — removed the indigo button from
  the Records page header. Only the ⋯ menu (archive/unarchive) remains.
- `components/patients/PatientsPage.js`:
  - Per-row "Start consultation" button → replaced with "View" button
  - Row click now navigates to `/dashboard/patients/<id>` (Records page) instead of consultation
  - Registration success screen: "Start consultation" → "View patient"
  - Removed the unused `startConsultation()` helper

**New consultations now start ONLY from the Consultation tab in the sidebar.**

### 2. TreatmentPaymentPanel reflowed
- `components/consultation/TreatmentPaymentPanel.js`
- Payment amount + mode now on a dedicated row below the allocation table
- Don't-allocate checkbox + explanatory text on its own row
- Status messages always visible below in colored boxes (green/amber/red)
- Empty state (no active treatments) cleaner

### 3. Dental chart updates
- `components/patients/DentalChart.js`
- Added "Others" condition (id: `others`, neutral slate color)
- Removed "Crown" entirely
- Renamed "RCT done" → "RCT Treated" (label only — underlying id stays `rct`,
  so no migration needed for historical data)

### 4. Urgency removed from Treatment Plan
- `components/patients/TreatmentPlan.js`
- Removed urgency dropdown from new-item form
- Removed urgency badge from the displayed treatment item list
- Removed unused `URGENCY_COLORS` and `URGENCY_LABELS` constants
- DB still receives `urgency: 'PLANNED'` as a default (no schema change),
  so existing items retain their stored urgency value; UI just doesn't expose it.

### 5. Wallet + per-sitting payment removed from Sittings screen
- `components/consultation/SittingsScreen.js`
- **WalletPanel component deleted entirely** (was a 150-line block with
  +Collect payment button + form)
- **Per-sitting `paid` and `payMode` fields removed** from the new-sitting form
- Form now: Date, Work done (required), Clinical notes (optional)
- Italic hint added: "Payment is collected at visit close — not per sitting."
- **Historical sittings still display `sitting.paid > 0`** with payment mode for backward
  compatibility — those rows are read-only.
- Parent state simplified: `totalCollected` and `wallet` state vars removed; the
  `walletBalance`, `totalReceipts`, `totalEstimate` props are accepted but unused
  (left in signature for backward compatibility with the page that passes them).

**Important data note:** No data is lost. `Sitting.paid` field stays in the
schema, historical sittings still display their payment data. We're only
removing the UI write paths going forward. All new payment recording happens
through the Close-visit screen.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-5-zip15/. .
git status
```

Should show 6 modified files. No schema changes.

```bash
npm run dev
```

## Smoke tests

### Test 1 — Start consultation removed from PatientsPage
1. Open `/dashboard/patients`
2. Each row should show "View" button (not "Start consultation")
3. Click a row → goes to that patient's Records page
4. Click "View" → also goes to Records page
5. Register a new patient → success screen says "View patient" + "Register another"

### Test 2 — Start consultation removed from Records page
1. Open any patient's Records page
2. Top-right should show only the ⋯ menu (archive button), no indigo "Start consultation"
3. Click ⋯ → Archive option works
4. Resume button in the in-progress visit banner (if any) still works correctly

### Test 3 — TreatmentPaymentPanel breathing room
1. Start a consultation, go through to Close screen on a patient with active treatments
2. Verify the treatment allocator table is readable, with comfortable spacing
3. Payment amount + mode inputs are on their own row
4. "Don't allocate now" checkbox has explanation text below the label

### Test 4 — Dental chart
1. Open any patient's Examination → dental chart
2. Click any tooth → the legend at the bottom should NOT show "Crown"
3. The "RCT" option now reads "RCT Treated"
4. New "Others" option appears (neutral grey)
5. Mark a tooth as Others → confirmed it saves and renders

### Test 5 — Urgency removed
1. Start a consultation, go to Treatment plan
2. Click "+ Add treatment"
3. Form shows: Procedure, Tooth, Estimated cost — NO Urgency dropdown
4. After saving the item, the displayed card shows NO urgency badge

### Test 6 — Sittings screen has no payment fields
1. Start a consultation where consent is signed → go to Sittings screen
2. Click "Record sitting" on a treatment item
3. Form shows: Date, Work done (required), Clinical notes — NO Payment collected, NO Payment mode
4. Italic line "Payment is collected at visit close — not per sitting." visible
5. Top of Sittings screen: NO Patient wallet panel
6. Save a sitting (with no payment) → succeeds
7. Click "Close visit →" at bottom → lands on Close screen
8. Take payment via Close screen's Treatment Payment section → works as expected
9. Open a patient who has historical sittings with payment (e.g. ORK-001 Karan Gupta):
   - Their old sittings still display the historical `paid` amount as read-only

## Deploy to production

After all 6 tests pass:

```bash
git add -A
git commit -m "Push #3.5 Zip 1.5: removed redundant payment UIs + Start consultation cleanup + dental chart polish"
git push
```

This goes out as the SAME commit as Zip 1, or as a separate commit after Zip 1.
Either is fine.

## What Dr. Shobhna sees changing

Tell her:
- New consultations start ONLY from the Consultation tab in the sidebar
- All payment goes through the Close-visit screen — no more per-sitting payment or wallet
- Examination dental chart: removed Crown, renamed RCT to "RCT Treated", added Others
- Treatment plan: removed Urgency dropdown (was unused)
- The treatment payment allocator on the Close screen is more spacious now

## Still pending (Zip 2)

- Treatments tab in sidebar (global active treatments list)
- Per-treatment detail page with "+ Sitting" and "Mark complete"
- Return-for-sitting flow
- Prescription slip print template
- "Apply unallocated" UI on records page
