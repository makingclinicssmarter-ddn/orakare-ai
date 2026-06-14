# Push #3 Day 4 — Consultation flow branching

## What Dr. Shobhna will feel

**This is the day the workflow changes for her.** Every consultation she does
after Day 4 lands will use the new branching flow:

```
Examination → ("Close visit" OR "Proceed to plan")
Treatment plan + Advice → ("Close visit" OR "Proceed to consent")
Consent screen → 
   - if all declined: "Close visit"
   - if some/all signed: ("Schedule = close visit" OR "Start treatment now")
Sittings → "Close visit"
```

Every "Close visit" path lands on the universal Close-visit screen (Day 2+3),
where she enters charges + payment + advice + next-appointment.

## Files in this push

```
NEW endpoint:
  app/api/visits/[visitId]/advice/route.js       (POST — saves advice from Plan screen)

MODIFIED components:
  components/patients/ExaminationView.js         (action bar: Close OR Proceed)
  components/patients/TreatmentPlan.js           (+ advice field, action bar branching)
  components/consultation/ConsentScreen.js       (smart branching by consent state)
  components/consultation/SittingsScreen.js      (route to /close after sitting)

MODIFIED page shells:
  app/dashboard/consultation/[patientId]/[visitId]/treatment/page.js  (passes existingAdvice prop)
```

No schema changes (Day 1 already added everything needed).

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-day4/. .
git status
```

Should show 5 modified files + 1 new endpoint folder.

No migration. Just code changes. Restart dev server to flush any cached state:

```bash
# Ctrl+C the running npm run dev
npm run dev
```

## Local smoke tests — walk through each path

### Test 1: State A (ADVISED) via examination
1. Start consultation on any test patient
2. Complete History
3. On Examination screen, save findings
4. Click **"Close visit"** (top-right button, not "Proceed")
5. Land on Close screen — pick ADVISED, add a consultation fee, save
6. Verify: Records page shows Visit · Advised with green badge

### Test 2: State A (ADVISED) via plan, no consent
1. Same as above but click "Proceed to treatment plan"
2. Add a treatment item, save plan
3. Enter advice text (e.g. "Patient considering")
4. Click **"Close visit (no consent)"**
5. Land on Close screen — advice is pre-filled from Plan screen
6. Pick ADVISED, save
7. Verify: Records page shows the visit with advice and outcome ADVISED

### Test 3: State B (CONSENTED) — schedule but don't start
1. Start consultation, complete History, save Examination
2. Proceed to plan, add a treatment, save
3. Proceed to consent, sign for the treatment
4. Click **"Schedule (close visit)"** (NOT "Start treatment now")
5. Land on Close screen, pick CONSENTED outcome, schedule next appointment, save
6. Verify: Visit outcome=CONSENTED, Appointment row created with next date

### Test 4: State C (TREATED) — start sitting today
1. Same as Test 3 up to consent signed
2. Click **"Start treatment now →"**
3. Land on Sittings screen, record a sitting
4. After saving sitting, click "Close visit →"
5. Land on Close screen, pick TREATED, save
6. Verify: Sitting exists, Visit outcome=TREATED

### Test 5: All declined consent path
1. Same as Test 3 up to consent screen
2. Decline ALL items (don't sign any)
3. Once allConsented becomes true (all PENDING are gone), see "All treatments declined" amber banner
4. Click "Close visit →"
5. Land on Close screen, pick ADVISED, save

## Deploy to production

```bash
git add -A
git commit -m "Push #3 Day 4: consultation flow branching with Close-visit terminus"
git push
```

Vercel deploys. ~90s.

## What Dr. Shobhna can now do (full Push #3 functionality, minus prescription slip)

- Start a consultation
- Examine → either close or plan
- Plan + advice → either close or consent
- Sign consent → either schedule or treat
- Record sitting → close
- Every path terminates at the universal Close screen
- Close screen handles charges, payment, inventory, next-appointment
- Invoice + Receipt + InventoryItem decrement + Appointment all created atomically

## Still pending — Day 5 (final)

- Prescription slip print template (the printable A5 document for the patient)
- Records page rendering polish — currently the Records page shows visit cards with outcome badges; Day 5 can add a "Print slip" button on each visit row.

## Known limitations on Day 4

- The advice textarea on Plan screen saves on blur via fetch. If she navigates
  away without blurring, advice may be unsaved. The Close-screen save catches
  this since she'll re-enter advice there.
- The visit's `outcome` is set by what Dr. Shobhna picks on the Close screen,
  not inferred from which branch she took. Means if she takes the "Start now"
  path and then on the Close screen picks ADVISED, the visit will be saved as
  ADVISED even though there are sittings. Edge case, but worth knowing.
- The old "Visit summary" screen (`/summary`) is still in the codebase but
  no flow leads to it anymore. Safe to delete in Day 5 cleanup.
