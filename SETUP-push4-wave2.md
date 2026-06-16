# Push #4 — Wave 2 (Examination layout redesign)

The substantial half of Push #4. Restructures the Examination screen
top-to-bottom and splits findings into Clinical + Radiographical sections.

## What changes

### Examination screen — new vertical layout

Top to bottom:
1. **Clinical findings** — text area. What Dr. Shobhna sees/palpates in the mouth.
2. **Radiographical findings** — text area. What she reads from X-rays.
3. **AI-assisted findings** — existing AIFindings component (image upload + AI analysis).
4. **Dental chart** — at the bottom. Tooth-by-tooth marking, the consolidated visualization.

Previously: side-by-side DentalChart + AIFindings, with a single "Clinical notes" textarea inside the chart.

The chart's Save button still saves everything (tooth markings + both findings sections).

### Data model

Two new fields on the `ClinicalFindings` table:
- `clinicalFindings` (text, nullable)
- `radiographicalFindings` (text, nullable)

The old `clinicalNotes` field stays for **backward compatibility**. New visits write to the new fields. Historical visits keep their data in `clinicalNotes` — the UI falls back to it when the new field is empty.

No data migration. Old visits read with fallback, new visits read directly.

### Prescription slip

Now shows two separate sections:
- **Clinical findings** (falls back to legacy clinicalNotes for historical visits)
- **Radiographical findings**

AI findings NOT shown on the slip — that's an internal aid, not a patient-facing detail. Dr. Shobhna's clinical findings text already reflects what she incorporated from AI suggestions.

## Files

```
SCHEMA:
  prisma/schema.prisma                                  (adds 2 fields)
  prisma/migrations/20260615120000_split_clinical_findings/migration.sql

API:
  app/api/patients/[id]/examination/route.js            (accepts new fields)
  app/api/visits/[visitId]/prescription-slip/route.js   (renders new sections)

UI:
  components/patients/ExaminationView.js                (vertical layout)
  components/patients/DentalChart.js                    (removed Clinical notes textarea)
```

6 files. Additive migration only.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push4-wave2/. .
git status
```

You should see 1 new migration, 1 modified schema, 4 modified files.

Local:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

The migration adds two nullable text columns. Zero risk to existing data.

## Smoke tests

### Test 1 — New examination flow (the critical one)
1. Register a new patient or open an existing one with no examination data yet
2. Start consultation → reach the Examination step
3. Verify vertical layout:
   - Top: **Clinical findings** textarea (placeholder mentions caries, mobility, etc.)
   - Below: **Radiographical findings** textarea (placeholder mentions bone loss, periapical, etc.)
   - Below: **AI-assisted findings** component (image upload area)
   - Bottom: **Dental chart** tooth grid
4. Verify the chart does NOT have its own "Clinical notes" textarea anymore (moved to top)
5. Type something in Clinical findings: "Caries on 14, 15. Mobility grade I on 31."
6. Type something in Radiographical findings: "Periapical radiolucency on 14. Generalized bone loss."
7. Mark tooth 14 as Caries on the chart (click tooth → select Caries)
8. Click Save in the chart
9. "Examination findings saved" appears
10. Refresh the page → all 3 inputs (clinical text, radiographical text, tooth markings) should be preserved

**Verify via SQL:**
```sql
SELECT id, "clinicalFindings", "radiographicalFindings", "clinicalNotes", "toothFindings"
FROM "ClinicalFindings" WHERE "visitId" = '<visitId>';
```
Expected: clinicalFindings + radiographicalFindings populated. clinicalNotes is NULL (new path doesn't write to it).

### Test 2 — Old visit (backward compat)
1. Open a patient who already had an examination before this deploy (e.g. ORK-001 Karan Gupta)
2. If you can navigate to their previous visit's examination data, the Clinical findings textarea should pre-populate from the legacy `clinicalNotes`
3. No data loss

### Test 3 — AI findings still work
1. Continue from Test 1
2. Scroll to AI-assisted findings section
3. Upload an X-ray image (or use existing ones)
4. AI analyzes → suggested findings appear
5. Tick the ones to add to the chart
6. Chart updates with new tooth markings

### Test 4 — Prescription slip shows new sections
1. Complete a TREATED visit with clinical + radiographical findings entered
2. Close the visit
3. From Records page, find the visit in Other Activity
4. Click "Print prescription slip"
5. Slip should have:
   - **Clinical findings** section showing the clinical text
   - **Radiographical findings** section showing the radiographical text
   - NO "AI findings" section

### Test 5 — Slip for historical visit (fallback)
1. Open a historical visit (pre-deploy) that has data in `clinicalNotes`
2. Print slip
3. **Clinical findings** section should show the legacy `clinicalNotes` content
4. **Radiographical findings** section is hidden (since the field is empty)

## Push to production

After all 5 tests pass:

```bash
git add -A
git commit -m "Push #4 wave 2: examination split into clinical + radiographical + AI + chart, top-to-bottom"
git push
```

Vercel runs the migration on deploy. Two new nullable columns added.

## What this leaves for Push #5+

- AI Findings deep integration (today AI sees X-rays; in future maybe AI sees clinical text too)
- Legacy `clinicalNotes` migration — eventually run a one-time `UPDATE` to copy data into `clinicalFindings` and drop the legacy field. Not urgent.
- Edit saved sitting (item 7 from Push #4 original list — still deferred until Dr. Shobhna names a specific case)

## What Dr. Shobhna sees

Tell her:
- The examination page is now vertical: type clinical findings first, then radiographical findings, AI analyzes any X-rays you upload, and you mark the dental chart at the bottom.
- The clinical notes box that used to be inside the chart is gone — its content moved to the Clinical findings section at the top.
- The prescription slip now shows two clear sections: Clinical findings and Radiographical findings, just like she dictates.
- Old visits still read correctly — nothing's lost.
