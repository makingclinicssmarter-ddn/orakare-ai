# Push #4 — Wave 1B (fixes from wave 1 testing)

Small follow-up patch. Two real issues caught by Dr. Shobhna's use:

## Fixes

### A. Current medications was STILL showing
Wave 1 removed it from `MedicalHistoryForm.js` (the old standalone form),
but the live consultation flow uses `StartVisit.js` — a different file
introduced in Push #3. That's the one Dr. Shobhna actually sees.

Also `ConsultationLayout.js` was rendering a read-only "Medications" pill
group in the patient header during consultation. Removed that too.

Files:
- `components/consultation/StartVisit.js`
- `components/consultation/ConsultationLayout.js`

### B. Edit button only reachable through Records page
Wave 1 wired the Edit button into the Records page header only. If she
spots a typo on the Patients list itself, she'd expect to fix it from
there directly. Now BOTH paths work:
- Patients list row → small Edit button next to View
- Patient Records page → Edit button next to ⋯ menu (unchanged)

Files:
- `components/patients/PatientsPage.js` (adds inline Edit on each row)
- `components/patients/EditPatientButton.js` (adds `size="sm"` variant for inline use)

## Files

```
MODIFIED:
  components/consultation/StartVisit.js
  components/consultation/ConsultationLayout.js
  components/patients/PatientsPage.js
  components/patients/EditPatientButton.js
```

4 files. No schema changes.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push4-wave1b/. .
git status
```

```bash
npm run dev
```

## Verify

### Test A — Current medications gone (for real this time)
1. Start a new consultation on any patient
2. History screen (first step) should show: Chief complaint, Conditions, Allergies — **NO Current medications**
3. The right-hand patient summary panel on the consultation flow should also NOT show a "Medications" pill group

### Test B — Edit on Patients list
1. Open `/dashboard/patients`
2. Each row's right-side cell now has TWO buttons: "Edit" and "View"
3. Click Edit on any row → modal opens, edit fields, save → row refreshes with new values
4. Click View → still goes to Records page as before
5. On the Records page header, the Edit button there still works as in Wave 1

## Push to production

```bash
git add -A
git commit -m "Push #4 wave 1b: medications removed from live flow + Edit button on Patients list"
git push
```
