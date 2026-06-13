# Push #3 Day 2+3 — Charges settings + Close-visit screen

## What this delivers

Two large pieces of Push #3, shipped together because they're independent of
the consultation flow modifications (which come in Day 4).

**1. Clinic charges settings page** at `/dashboard/settings/clinic-charges`
- Dr. Shobhna can add, edit, deactivate her standard fees here
- Used by the Close-visit screen as quick-add buttons
- Editable anytime — she can revise amounts when prices change

**2. Close-visit screen** at `/dashboard/consultation/[patientId]/[visitId]/close`
- The universal terminus for every visit (Day 4 wires consultation flow to it)
- 4 sections: Charges (presets + custom + per-line discount), Inventory
  (search + decrement stock on save), Total discount + Payment, Advice, Next
  appointment
- Single transaction on save: updates Visit + creates Invoice/InvoiceItems +
  creates Receipt + decrements InventoryItem.stockQty + creates Appointment
- Today: reachable only via the unresolved-visit banner (which won't appear
  for any current patient — see "Limitations" below)

## Files

```
NEW endpoints:
  app/api/clinics/[clinicId]/charges/route.js          (GET + PUT)
  app/api/inventory/search/route.js                    (GET)
  app/api/consultation/visit/[visitId]/close/route.js  (POST — the big one)

NEW pages:
  app/dashboard/settings/clinic-charges/page.js
  app/dashboard/consultation/[patientId]/[visitId]/close/page.js

NEW components:
  components/settings/ClinicChargesEditor.js
  components/consultation/CloseVisitScreen.js
  components/consultation/ChargesPanel.js
  components/consultation/InventoryPicker.js
  components/consultation/NextAppointmentPicker.js
```

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-day23/. .
git status
```

No new migrations — Day 1 already added the schema fields. The new code uses
them.

```bash
npm run dev
```

## Local smoke tests

### Test 1: Configure clinic charges

1. Navigate to `/dashboard/settings/clinic-charges`
2. Click "+ Add charge" → enter "Consultation", category CONSULTATION, ₹500
3. Click "+ Add charge" again → enter "OPG", category RADIOGRAPH, ₹400
4. Click "+ Add charge" → enter "Bitewing X-ray", category RADIOGRAPH, ₹250
5. Click "Save changes" → should show "Saved" message

Verify in DB:
```sql
SELECT charges FROM "Clinic" WHERE id = 'cmpyguilj00007wnzp5xnvy7j';
```
Should return your three entries as JSONB array.

### Test 2: Open the Close screen manually

The close screen isn't linked from the consultation flow yet (Day 4). To test
it directly, pick any in-progress visit ID and navigate to:

```
/dashboard/consultation/<patientId>/<visitId>/close
```

You'll see the screen render with:
- Patient header
- Outcome selector (3 buttons — pick ADVISED)
- Charges section with your preset buttons
- Inventory search
- Total discount + payment row
- Totals strip
- Advice text
- Next appointment toggle

Try the flow:
1. Click "+ Consultation" preset → charge appears
2. Click "+ OPG" preset → charge appears
3. Search "mouthwash" in inventory → click a result → inventory row appears
4. Enter quantity, verify total recalculates
5. Add total discount ₹100 → grand total updates
6. Enter payment ₹500, mode Cash
7. Check "Schedule next" → pick a date
8. Add advice text
9. Click "Save & close visit"

After save, the page redirects to the patient's Records page. Check:

```sql
-- Visit should be closed
SELECT id, outcome, advice, "nextAppointmentDate", "needsResolution", status
FROM "Visit" WHERE id = '<visitId>';

-- Invoice should exist
SELECT "invoiceNo", subtotal, discount, total, paid, balance, status
FROM "Invoice" WHERE "patientId" = '<patientId>' ORDER BY "createdAt" DESC LIMIT 1;

-- Inventory should be decremented
SELECT id, name, "stockQty" FROM "InventoryItem" WHERE name LIKE '%mouthwash%';

-- Appointment row created
SELECT id, name, date, slot FROM "Appointment" WHERE "patientId" = '<patientId>' ORDER BY "createdAt" DESC LIMIT 1;
```

### Test 3: Error handling

- Click Save with no outcome → should not allow
- Add inventory quantity exceeding stock → warning appears, still allowed (it's
  her decision; we don't block)
- Save with no charges, no payment, no next appt → should still work (just
  updates Visit outcome + advice)

## Deploy to production

```bash
git add -A
git commit -m "Push #3 Day 2+3: clinic charges settings + close-visit screen"
git push
```

## Limitations on Day 2+3

- The unresolved-visit banner from Day 1 still leads to /close, which now
  works. But for it to appear, a visit needs needsResolution=true. The 3
  visits Dr. Shobhna started this morning have needsResolution=false (created
  before Day 1 deployed). So the banner won't appear for her current
  in-flight visits — she'll continue them through the old flow.
- New consultations started AFTER Day 1 went live (so created post-deploy)
  WILL set needsResolution=true. If she abandons any going forward, they'll
  surface in the banner.
- The consultation flow's branching (Examination → "Close or Proceed" etc.) is
  still Day 4 work.
- No prescription slip yet — Day 5.

## What Dr. Shobhna can do now

1. Configure her standard fees at `/dashboard/settings/clinic-charges` — this
   helps no matter what flow she uses.
2. If she ever has an abandoned visit that needs to be properly closed (e.g.
   a future patient where she examined them and they left), she can manually
   navigate to the close URL and close it.

## What to test before declaring Day 2+3 done

The big test: does the entire close-visit transaction work end-to-end? An
Invoice + Receipt + Appointment + inventory decrement should all happen
together OR not at all. Run Test 2 above; verify all 4 DB writes via the
queries.

If any one fails to write while others succeed, that's a transaction bug
and you need to tell me immediately — we can't ship Day 4 on a broken
foundation.
