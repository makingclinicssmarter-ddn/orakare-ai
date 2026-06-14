# Push #3.5 — Zip 2 of 2 (final)

The final piece of Push #3.5. Delivers:
- Treatments tab + browse
- Per-treatment detail page with sittings + Mark complete (with completion note)
- Return-for-sitting flow (new Visit per sitting, skipping History/Exam/Plan/Consent)
- Prescription slip print template (A5, no charges)
- Apply unallocated payments to specific treatments
- Sidebar "Treatments" tab

**No schema changes** — uses existing `Treatment.status`, `Treatment.completedAt`,
`PaymentAllocation` etc.

## Files

```
NEW endpoints:
  app/api/treatments/route.js                                  (GET list)
  app/api/treatments/[treatmentId]/route.js                    (GET detail)
  app/api/treatments/[treatmentId]/complete/route.js           (POST)
  app/api/treatments/[treatmentId]/sitting/route.js            (POST — return-for-sitting)
  app/api/receipts/[receiptId]/allocate/route.js               (POST — apply unallocated)
  app/api/visits/[visitId]/prescription-slip/route.js          (GET HTML — printable slip)

NEW pages:
  app/dashboard/treatments/page.js                             (browse list)
  app/dashboard/treatments/[treatmentId]/page.js               (detail)
  app/dashboard/treatments/[treatmentId]/sitting/page.js       (return-for-sitting form)

NEW components:
  components/treatments/TreatmentsList.js                      (browse table)
  components/treatments/TreatmentDetailView.js                 (detail view)
  components/treatments/MarkCompleteButton.js                  (with note modal)
  components/treatments/ReturnForSittingScreen.js              (sitting form)
  components/patients/UnallocatedBanner.js                     (banner + modal trigger)
  components/patients/ApplyUnallocatedModal.js                 (allocation modal)

MODIFIED:
  components/layout/Sidebar.js                                 (+ Treatments tab)
  app/dashboard/patients/[id]/page.js                          (use UnallocatedBanner + Print slip on visits)
```

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-5-zip2/. .
git status
```

You should see roughly 16 new files + 2 modified.

No migration needed. Restart dev server:

```bash
npm run dev
```

## Smoke tests — walk through each new feature

### Test 1 — Treatments tab loads + filters work
1. Click "Treatments" in left sidebar (between Consultation and Patients)
2. Lands on `/dashboard/treatments`
3. Sees a table with all currently active treatments (9 entries from your data)
4. Default filter is "Active" (PLANNED + IN_PROGRESS)
5. Click "Completed" filter chip → shows 77 historical treatments
6. Click "All" → shows everything
7. Type a patient name in search → filters live
8. Press Enter or click outside → URL updates (good for bookmarking)
9. Status pills colored correctly (amber for In progress, green for Completed)

### Test 2 — Treatment detail page
1. From Treatments tab, click any active treatment row (or a "Sittings" cell)
2. Lands on `/dashboard/treatments/<id>`
3. Header shows: treatment name, area, status pill, patient + ORK ID, started date
4. Estimate / Paid / Balance cards
5. Past sittings list (most recent first), with description + clinical notes
6. "Payments allocated" section (if any PaymentAllocations exist)
7. Top-right buttons: "+ Sitting" (indigo) and "Mark complete" (green outline)

### Test 3 — Mark complete with note
1. On a treatment detail page, click "Mark complete"
2. Modal appears asking for an optional completion note
3. Type a note like "Crown delivered, occlusion adjusted, patient happy"
4. Click "Mark complete" button in modal
5. Modal closes, page refreshes
6. Treatment status pill now shows "Completed" (green)
7. The "+ Sitting" and "Mark complete" buttons are gone
8. Notes section now contains "[Completed 14 Jun 2026] Crown delivered…"
9. Go back to Treatments tab → this treatment is gone from "Active" filter, visible in "Completed" filter

### Test 4 — Return-for-sitting flow (the big one)
**Setup:** Pick an active treatment from earlier today's testing (e.g. the RCT from your TREATED test).

1. From Treatments tab or treatment detail page, click "+ Sitting"
2. Lands on `/dashboard/treatments/<id>/sitting`
3. Page shows:
   - Treatment header snapshot (estimate / paid / balance)
   - Recent sittings list (up to 5)
   - Blue info box explaining History/Exam/Plan/Consent are skipped
   - Form: Date (defaults today), Work done (required), Clinical notes (optional)
   - Italic line "Payment is collected at visit close — not per sitting."
4. Fill in Work done: "Obturation completed, post-op X-ray taken"
5. Click "Save & close visit →"
6. Should land on the Close-visit screen for a NEW visit (different visitId from the original)
7. Section 2 (Treatment payment) shows the treatment with current paid + balance
8. Allocate ₹500 to it, set payment ₹500 Cash, Save & close
9. Go back to the patient's Records page:
   - Should see TWO visits in "Other activity" (the original TREATED + this new one)
   - The new one shows outcome=TREATED with the advice/charges if any
   - Treatment shows updated Paid (+₹500) and Balance (-₹500)

```sql
-- Verify the new visit + sitting
SELECT v.id, v.status, v.outcome, v."createdAt"
FROM "Visit" v
WHERE v."patientId" = '<patient>' ORDER BY v."createdAt" DESC LIMIT 2;

-- The new sitting attached to the original TreatmentItem
SELECT s.id, s.date, s.description, s.paid FROM "Sitting" s
JOIN "TreatmentItem" ti ON ti.id = s."treatmentId"
JOIN "Treatment" t ON t."treatmentItemId" = ti.id
WHERE t.id = '<treatment>' ORDER BY s."createdAt" DESC LIMIT 5;
```

### Test 5 — Save sitting only (without closing visit)
1. From treatment detail, "+ Sitting"
2. Fill in work done
3. Click "Save sitting only" (not the indigo "& close visit" button)
4. Should redirect to treatment detail page
5. The new sitting appears in the list
6. The newly-created Visit is still status=TREATMENT_CONSENT_SIGNED, needsResolution=true
7. Visit appears on patient's Records page with the AMBER "unresolved visit" banner
8. Click banner → goes to Close screen for that visit
9. She can now close it cleanly

### Test 6 — Print prescription slip
1. Open any patient with a closed visit
2. In "Other activity" section, find a completed visit card
3. Click "Print prescription slip →" link (bottom-right of card)
4. New tab opens with `/api/visits/<id>/prescription-slip` rendered as HTML
5. Top-right of the slip page has a blue "Print" button
6. Click it → browser print dialog appears
7. Verify slip layout (A5):
   - Clinic name + address + phone + doctor + qualification + reg no
   - Patient name/age/sex/mobile/ID/visit date
   - Chief complaint (if any)
   - Findings (clinical notes if any)
   - Treatments planned/started/treated
   - Medications dispensed (only inventory items, NOT consultation/X-ray)
   - Advice
   - Next appointment
   - Footer with generated timestamp + doctor signature line
   - **NO charges, NO total paid, NO invoice info** (per Dr. Shobhna's spec)

### Test 7 — Apply unallocated
**Setup:** Create an unallocated payment first.

1. Start a fresh consultation through to Close screen with outcome=TREATED
2. In Section 2 (Treatment payment), enter ₹1000 + check "Don't allocate now"
3. Save & close
4. Go to that patient's Records page → amber banner: "Unallocated payment: ₹1,000"
5. Click "Apply unallocated →" button on the banner
6. Modal opens showing:
   - The unallocated receipt (₹1000 Cash, with date)
   - List of active treatments with balance
   - "Allocate" input column
7. Type allocation amounts: e.g. ₹600 to one treatment, ₹400 to another
8. Status box turns green: "✓ Fully allocated"
9. Click "Apply allocation"
10. Modal closes, page refreshes
11. Banner is gone (no more unallocated)
12. Treatments section shows updated paid + balance
13. Treatment detail pages for those treatments show new payment rows in "Payments allocated"

```sql
-- Verify allocations created
SELECT pa.amount, t.type FROM "PaymentAllocation" pa
JOIN "Treatment" t ON t.id = pa."treatmentId"
WHERE pa."receiptId" = '<receipt-id>';
-- Expected: 2 rows summing to ₹1000
```

### Test 8 — Apply unallocated edge cases
1. Try to allocate more than the receipt amount → status box red, button disabled
2. Try to allocate less than the receipt amount → status amber, button disabled
3. Try to allocate to a treatment with ₹0 balance → max attribute on input prevents it from exceeding balance
4. Patient with no active treatments → banner says "No active treatments to allocate to yet" and button is hidden

### Test 9 — Sidebar Treatments tab is present
1. Look at left sidebar
2. Order: Dashboard → Consultation → **Treatments** → Patients → Appointments → ...
3. Treatments has the medical-cross icon
4. Click highlights it as active when on `/dashboard/treatments` or sub-pages

## Deploy to production

After all 9 tests pass locally:

```bash
git add -A
git commit -m "Push #3.5 Zip 2: Treatments tab + return-for-sitting + prescription slip + apply unallocated"
git push
```

## What Dr. Shobhna sees changing

Tell her:
- **New "Treatments" tab in the sidebar.** All running treatments across patients in one list. Filter by status, search by patient name or treatment type. Click any row to open the treatment detail.
- **Each treatment now has a dedicated page** showing all its sittings, payments allocated, and quick actions.
- **"+ Sitting" button** lets you add a follow-up sitting to any active treatment WITHOUT going through History/Examination/Plan/Consent again. Skip straight to recording today's work.
- **"Mark complete" button** moves a treatment out of the active list. She'll be asked for an optional completion note.
- **"Print prescription slip"** on every closed visit's card. Opens in a new tab with a Print button. A5 size, no charges or totals (since the invoice is a separate document).
- **"Apply unallocated"** button appears on the Records page when there's a parked payment. Lets her distribute it across treatments later.

## Known limitations / Push #4 territory

- General + Radiographical examination separation (Dr. Shobhna's 3rd observation from earlier)
- Examination page top-to-bottom layout redesign
- Edit/delete sittings or treatments
- AI clinical notes drafting
- Patient-facing visual explainer
- WhatsApp integration
- Edit clinic charge presets without losing historical invoice line items
- Historical `sitting.paid` migration into proper Receipt+PaymentAllocation rows (to drop the fallback in the per-treatment paid calc)

## After Push #3.5 ships

Dr. Shobhna has the complete workflow she's been asking for:
- Branching consultation outcomes (ADVISED/CONSENTED/TREATED)
- Dual-payment Close screen with manual allocation
- Treatments tab to browse + add sittings to running treatments
- Mark complete with notes
- Prescription slip
- Apply unallocated
- Clean financial reporting that distinguishes treatment payments from visit charges

**Recommendation:** Let her use it for at least 2-3 full days before starting Push #4. Real use will surface the next round of friction points more reliably than any planning session.
