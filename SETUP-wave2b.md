# Push #4 — Wave 2B (AI clinical-notes drafter)

Companion to Wave 2. Adds an AI assistant that expands shorthand into
professional clinical findings text.

**Apply on top of Wave 2.** This zip assumes Wave 2's split-findings layout
is already deployed. Wave 2B just adds the "Draft with AI" button + result panel
+ new API endpoint.

## What it does

Dr. Shobhna writes shorthand in either findings textarea — for example:
```
caries 14, 15. mobility I on 31. recession ul quadrant.
```

She clicks "✨ Draft with AI" below the textarea. Claude Haiku expands it:
```
Carious lesions noted on teeth 14 and 15. Grade I mobility observed on
tooth 31. Generalized gingival recession noted in the upper left quadrant.
```

A preview panel appears with two buttons:
- **"Use this"** — replaces the textarea content with the drafted text
- **"Discard"** — keeps her shorthand, throws away the draft

She can edit the result manually after accepting. The draft is just a starting
point.

## Design choices

**No contextual data sent.** Per Dr. Shobhna's call: the doctor's findings are
authoritative. The drafter sees only the shorthand text. It doesn't know about
the chief complaint, the tooth markings she's already made, or AI image findings
she's accepted. This:
- Keeps the API prompt short (~$0.001 / draft)
- Makes the behavior predictable
- Avoids the AI inventing findings the doctor didn't write

**Two prompt variants:**
- Clinical: focused on intraoral findings
- Radiographical: focused on X-ray-derived findings

Both prompts emphasize: don't invent, don't pad, stay faithful to the
shorthand. The model knows it's an aid, not the source of truth.

**Model:** `claude-haiku-4-5-20251001` — fast (~1-2s), cheap (~$0.001 / call).

## Files

```
NEW endpoint:
  app/api/ai/draft-findings/route.js

NEW component:
  components/patients/AIDraftPanel.js

MODIFIED component:
  components/patients/ExaminationView.js   (renders AIDraftPanel below each textarea)
```

3 files. No schema changes.

## Prerequisites

1. **Wave 2 must already be deployed** (vertical examination layout + split fields)
2. **ANTHROPIC_API_KEY must be set** in Vercel environment variables. You
   already have this — it's used by the existing AI Findings + Treatment Plan
   endpoints.

If `ANTHROPIC_API_KEY` is missing, the draft button will fail with a 500.
Easy to check after deploy by clicking the button on any patient.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push4-wave2b/. .
git status
```

Should show 1 modified file (`ExaminationView.js`) and 2 new files
(`AIDraftPanel.js`, `app/api/ai/draft-findings/route.js`).

No migration needed.

```bash
npm run dev
```

## Smoke tests

### Test 1 — Clinical findings draft
1. Start a new consultation, reach Examination
2. In **Clinical findings** textarea, type shorthand: `caries 14 15, mobility I 31, recession ul quadrant`
3. Click **"✨ Draft with AI"** below the textarea
4. Wait 1-2 seconds — preview panel appears with expanded notes
5. Verify the draft expands the shorthand without inventing extra findings
6. Click **"Use this"** → textarea content is replaced with the draft
7. Edit something manually if needed
8. Save the chart → verify saved correctly via SQL:
   ```sql
   SELECT "clinicalFindings" FROM "ClinicalFindings" WHERE "visitId" = '<id>';
   ```

### Test 2 — Radiographical findings draft
1. Same examination, in **Radiographical findings** textarea
2. Type shorthand: `periapical 14, bone loss generalized, impacted 38 mesioangular`
3. Click "✨ Draft with AI"
4. Preview panel should use radiographical terminology (NOT clinical-mouth language)
5. Click "Use this" or "Discard" — both work

### Test 3 — Empty shorthand
1. Clear the textarea
2. Click "✨ Draft with AI"
3. Should show inline error: "Type some shorthand above first, then click Draft."
4. Button should also be disabled when textarea is empty

### Test 4 — Discard flow
1. Draft something
2. Preview panel appears
3. Click **Discard**
4. Panel closes
5. Original textarea content stays unchanged

### Test 5 — Save after AI draft
1. Type shorthand → draft → use → edit manually → save chart
2. Verify the FINAL textarea content is what got saved (not the AI draft, not the shorthand)
3. Refresh page → saved text persists

### Test 6 — Network error / missing API key
1. Temporarily unset `ANTHROPIC_API_KEY` in `.env.local`
2. Restart dev server
3. Click "Draft with AI"
4. Should show error in red, panel stays open

## Cost monitoring

Each draft costs roughly $0.001-0.002 (₹0.10-0.20). At 20 drafts/day = ~₹4/day
= ~₹120/month. Negligible at this scale.

If usage grows large, switch model to `claude-opus-4-7` for higher quality —
but the cost would be ~50× higher. Haiku is the right default.

## Push to production

```bash
git add -A
git commit -m "Push #4 wave 2B: AI clinical-notes drafter — Haiku expands shorthand into professional notes"
git push
```

## What Dr. Shobhna sees

Tell her:
- New button below the Clinical findings and Radiographical findings textareas: "✨ Draft with AI"
- Type her usual shorthand, click the button, AI expands it into proper notes
- She reviews — "Use this" to accept, "Discard" to throw away
- She can still edit after accepting
- It's an aid, not a replacement — always review before saving

**Privacy note worth mentioning to her:** Each draft sends the shorthand text to
Anthropic's API. No patient name, no identifying info — just the clinical
content. This is standard for healthcare AI assist tools and is the same
infrastructure already used by AI Findings and Treatment Plan generation.

## What this completes

Push #4 is now substantively done:
- Wave 1: dashboard cleanup + edit patient + per-unit discount + mark-complete-on-close + record payment + 4 other items
- Wave 1B: medications removed from live flow + Edit on Patients list
- Wave 2: examination vertical layout + Clinical/Radiographical split + slip update
- Wave 2B: AI clinical-notes drafter

Still deferred:
- Edit saved sitting (Push #5 — waiting for Dr. Shobhna's specific case)
- Historical clinicalNotes migration (Push #5+, not urgent)
- WhatsApp notifications (Push #5+)
- Inventory item management UI (Push #5+)

After this deploys, let her use the full Push #4 for a few days before the
next iteration cycle. Feedback from real use of the drafter is high-signal.
