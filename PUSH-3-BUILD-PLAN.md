# Push #3 — Visit Flow Redesign — Build Plan

> Read this before any code is written. Sign off section-by-section if anything
> looks wrong. Cost of changing the plan: minutes. Cost of changing the code
> after the fact: hours per change.

## Goal

Replace the single-line `History → Examination → Plan → Consent → Sittings`
flow with a branching flow that models the three real outcomes of a clinic
visit (Advised, Consented, Treated). End every visit on a universal
"Close-visit" screen that handles charges, payment, advice, next-appointment,
and generates a printable prescription slip.

## Scope confirmed by Dr. Shobhna

1. **Flow:** Examination → (close OR plan). Plan → record advice → (close OR
   consent). Consent → (decline = close) OR (sign = start now OR schedule).
2. **Charges:** Presets configured in Clinic settings, with per-treatment
   discount and total discount tabs on close-visit.
3. **Inventory dispensing:** Clickable picker on close-visit screen,
   decrements `InventoryItem.stockQty` on save.
4. **Prescription slip:** Includes all proposed clinical fields EXCEPT charges
   and total paid (invoice is a separate document).
5. **Old in-progress visits:** Force-resolve via banner — Dr. Shobhna closes
   them manually before the visit can be used further. No auto-backfill.

---

## Data model changes

### Visit (additive only)

```prisma
model Visit {
  ...existing fields stay...
  outcome             VisitOutcome?    // null = legacy/historical
  advice              String?
  nextAppointmentDate DateTime?
  needsResolution     Boolean  @default(false)
}

enum VisitOutcome {
  ADVISED      // examined ± plan, no consent today
  CONSENTED    // consent signed, no sitting today (deferred)
  TREATED      // consent signed and at least one sitting done today
}
```

`needsResolution` defaults `true` for new visits; flipped to `false` when the
visit reaches the Close-visit screen and is saved. Visits with `outcome=null`
AND `needsResolution=true` AND `status != COMPLETED` trigger the force-resolve
banner.

### Clinic (additive)

```prisma
model Clinic {
  ...existing fields stay...
  charges Json @default("[]")  // [{ id, label, category, amount, active }]
}
```

Categories suggested in UI: `CONSULTATION`, `RADIOGRAPH`, `OTHER`. Free-text
allowed.

### Existing models — no changes

- `Invoice` + `InvoiceItem` — reused as-is for visit-level charges
- `Receipt` — reused as-is for visit payment
- `InventoryItem` — only mutation is `stockQty` decrement
- `Appointment` — reused as-is when scheduling next visit
- `Treatment` + `Sitting` — untouched

### Migration

Single migration file. Additive only. Backward compatible — old code reading
Visit still works because new fields default sensibly.

---

## Flow state machine

```
                          [enter consultation]
                                 ↓
                            History screen
                                 ↓
                          [save history]
                                 ↓
                          Examination screen
                                 ↓
                          [save examination]
                                 ↓
                       ┌─────────┴──────────┐
                       │                    │
                  Close visit          Proceed to plan
                  (outcome=ADVISED)         │
                       │                    ↓
                       │              Plan + Advice screen
                       │                    │
                       │              [save plan + advice]
                       │                    │
                       │           ┌────────┴─────────┐
                       │           │                  │
                       │      Close visit        Proceed to
                       │      (outcome=ADVISED)   consent
                       │           │                  │
                       │           │                  ↓
                       │           │            Consent screen
                       │           │                  │
                       │           │           ┌──────┴──────┐
                       │           │           │             │
                       │           │       Decline       Sign consent
                       │           │       (close)            │
                       │           │           │       ┌─────┴─────┐
                       │           │           │       │           │
                       │           │           │   Start now   Schedule
                       │           │           │   (sitting)   appointment
                       │           │           │       │           │
                       │           │           │       ↓           │
                       │           │           │   Sitting screen  │
                       │           │           │       │           │
                       └───────────┴───────────┴───────┴───────────┘
                                          │
                                          ↓
                                  Close-visit screen
                                  (universal terminus)
                                          ↓
                                   [save & generate slip]
                                          ↓
                            Prescription slip (printable)
                                          ↓
                                  Visit COMPLETED
                                  outcome set
                                  needsResolution=false
```

Outcomes by path:
- Examination → Close: `ADVISED`
- Plan → Close: `ADVISED` (with advice text)
- Consent → Decline → Close: `ADVISED`
- Consent → Sign → Schedule: `CONSENTED`
- Consent → Sign → Sitting → Close: `TREATED`

---

## File-by-file inventory

### Schema + migration

| File | Action | Lines (est.) |
|---|---|---|
| `prisma/schema.prisma` | Modify: add Visit fields, VisitOutcome enum, Clinic.charges | +12 |
| `prisma/migrations/20260613xxxxxx_visit_outcome_and_clinic_charges/migration.sql` | New | 25 |

### API routes

| File | Action | Purpose |
|---|---|---|
| `app/api/consultation/visit/[visitId]/close/route.js` | NEW | Save outcome + advice + nextApt + create Invoice + Receipt + decrement inventory + flip needsResolution=false. Transaction. |
| `app/api/consultation/visit/[visitId]/advice/route.js` | NEW | Save advice text from Plan screen (so it's pre-filled at Close) |
| `app/api/clinics/[clinicId]/charges/route.js` | NEW (GET, PUT) | Read/write clinic charge presets |
| `app/api/inventory/search/route.js` | NEW (GET ?q=) | Search InventoryItem for the picker on Close screen |
| `app/api/consultation/start/route.js` | MODIFY | When creating new Visit, set needsResolution=true |
| `app/api/patients/[id]/treatment-plan/route.js` | MODIFY (small) | Also accept and save `advice` field |
| `app/api/visits/[visitId]/route.js` | NEW (GET) | Return full visit state for Close screen pre-fill |

### Page routes (new screens)

| File | Action | Purpose |
|---|---|---|
| `app/dashboard/consultation/[patientId]/[visitId]/close/page.js` | NEW | The Close-visit screen — server component shell |
| `app/dashboard/settings/clinic-charges/page.js` | NEW | Charge presets settings panel |
| `app/api/visits/[visitId]/prescription-slip/route.js` | NEW | Renders prescription HTML (route handler) for print |

### Page routes (modify existing)

| File | Action | Purpose |
|---|---|---|
| `app/dashboard/consultation/[patientId]/[visitId]/examination/page.js` | MODIFY | Add "Close visit OR Proceed to plan" choice on save |
| `app/dashboard/consultation/[patientId]/[visitId]/treatment/page.js` | MODIFY | Add advice textarea + "Close OR Proceed to consent" choice |
| `app/dashboard/consultation/[patientId]/[visitId]/consent/page.js` | MODIFY | Add "Decline = close" + "Sign + start now OR schedule" branching |
| `app/dashboard/consultation/[patientId]/[visitId]/sittings/page.js` | MODIFY | After sitting saved, route to Close screen instead of dead-end |
| `app/dashboard/patients/[id]/page.js` (Records) | MODIFY | Render new outcome types, show advice + needsResolution banner |

### Components

| File | Action | Purpose |
|---|---|---|
| `components/consultation/CloseVisitScreen.js` | NEW | The big interactive close-visit UI (client component) |
| `components/consultation/ChargesPanel.js` | NEW | Presets + custom + per-line discount + total discount |
| `components/consultation/InventoryPicker.js` | NEW | Search + add inventory items with stock decrement |
| `components/consultation/AdviceField.js` | NEW (small) | Reusable advice textarea (used on Plan + Close screens) |
| `components/consultation/NextAppointmentPicker.js` | NEW | Date + slot picker, creates Appointment record on save |
| `components/consultation/StepBranchButtons.js` | NEW | The "Close OR Proceed" decision UI used on multiple steps |
| `components/visits/UnresolvedVisitBanner.js` | NEW | The force-resolve banner |
| `components/settings/ClinicChargesEditor.js` | NEW | The charges-preset editor UI |
| `components/prescription/PrescriptionSlip.js` | NEW | The print-ready slip layout (server component or HTML helper) |

### Total

- 7 new API routes
- 2 modified API routes
- 3 new page routes
- 5 modified page routes
- 9 new components
- 1 schema migration

Estimated total: **~1800-2200 lines of new code, ~150 lines of changes to
existing files.**

---

## Build order (mandatory sequence)

Some pieces depend on others. This is the order I'll write the code.

**Day 1 — Foundation**
1. Schema migration (additive, safe to land first)
2. `consultation/start` route update (needsResolution=true for new visits)
3. Visit GET route (needed by Close screen)
4. `UnresolvedVisitBanner` component
5. Records page banner integration

After Day 1: production has the migration applied and the unresolved-visit
banner showing for any existing in-progress visits. No functional regression.
Dr. Shobhna can start manually closing them later.

**Day 2 — Charges settings + inventory search**
6. `clinics/[clinicId]/charges` GET/PUT routes
7. Clinic charges settings page + editor component
8. `inventory/search` route

After Day 2: Dr. Shobhna can configure her charge presets. Settings panel
live. Doesn't break consultation flow yet.

**Day 3 — The Close-visit screen (centerpiece)**
9. `visits/[visitId]/close` POST route
10. `consultation/.../close/page.js` shell
11. `CloseVisitScreen` component
12. `ChargesPanel` component
13. `InventoryPicker` component
14. `NextAppointmentPicker` component

After Day 3: Close-visit screen functional. Can be reached via URL but not
linked from consultation flow yet.

**Day 4 — Flow branching + advice**
15. `AdviceField` + `StepBranchButtons` components
16. Treatment plan page modifications (advice + branching)
17. Examination page modifications (branching)
18. Consent page modifications (branching)
19. Sittings page modifications (route to Close)
20. `visits/[visitId]/advice` route

After Day 4: full flow live. Real consultations can use the new flow
end-to-end.

**Day 5 — Prescription slip + polish**
21. `prescription-slip` route + `PrescriptionSlip` component
22. Records page updates (render outcomes correctly)
23. Edge case testing
24. SETUP guide

---

## Test plan

Before shipping, walk through each path manually:

**Test 1: State A — Advised only (no plan)**
- Start consultation. Save history. Save examination.
- Click "Close visit"
- Add consultation fee + radiograph fee + a mouthwash from inventory.
- Apply ₹100 total discount.
- Receive payment cash.
- Click Save.
- Confirm: Invoice + Receipt created, inventory stockQty decremented.
- Confirm: Prescription slip generates with findings + advice, no charges.
- Confirm: Visit.outcome=ADVISED, needsResolution=false.

**Test 2: State A2 — Advised after plan**
- Same as Test 1 but proceed to plan screen, enter treatment plan, enter advice, click "Close visit" (no consent).
- Confirm: TreatmentItem rows have consentStatus=PENDING (not SIGNED).
- Confirm: No Treatment row created.
- Confirm: Slip shows advised treatments + advice.

**Test 3: State B — Consented, deferred (CONSENTED outcome)**
- Plan → consent → sign → click "Schedule next appointment".
- Pick date + time slot.
- Charges added.
- Save.
- Confirm: Appointment row created, Visit.outcome=CONSENTED, nextAppointmentDate set.
- Confirm: TreatmentItem.consentStatus=SIGNED, Treatment row created with status=PLANNED.

**Test 4: State C — Consented + started (TREATED outcome)**
- Plan → consent → sign → click "Start treatment now".
- Sitting screen records first sitting.
- After saving sitting, redirected to Close screen.
- Charges may already include the sitting payment OR added fresh — handle both.
- Save Close.
- Confirm: Sitting created, Receipt for sitting + Receipt for additional charges, Visit.outcome=TREATED.

**Test 5: Force-resolve banner**
- Manually update one Visit row in DB: set needsResolution=true, outcome=null, status='EXAMINATION_DONE'.
- Reload patient's Records page.
- Confirm banner appears with "Resolve this visit" button.
- Click → goes to Close screen pre-populated with whatever exists for that visit.

**Test 6: Clinic charges editor**
- /dashboard/settings/clinic-charges → add 3 presets.
- Refresh consultation Close screen → confirm presets appear as quick-buttons.

---

## Known risks and mitigations

**Risk 1: The Close screen is big and complex.**
4 sub-sections (charges, inventory, payment, next appointment) plus advice.
First user contact will surface ergonomic issues.

**Mitigation:** Test 1 first thing after Day 3 build with Dr. Shobhna using
the dev environment. Iterate on layout before considering the screen done.

**Risk 2: Inventory decrement on save = potential overcounting if she edits a visit.**

**Mitigation:** v1 doesn't allow editing a closed visit's charges. If she
makes a mistake, she creates a new visit/adjustment. Deferred for Push #4.

**Risk 3: Existing in-progress visits will show the banner immediately after
deploy.** Dr. Shobhna will see "you have 5 visits to resolve" — alarming.

**Mitigation:** Pre-mark all imported historical visits with
`needsResolution=false` in the migration itself (they're already COMPLETED,
no resolution needed). Only NEW visits started after migration get the
banner.

**Risk 4: Schedule next appointment workflow assumes Appointment system
works.** If the existing appointment code has bugs, this surfaces them.

**Mitigation:** Test appointment booking standalone first in Day 2. Fix any
issues before building the Close screen's integration.

**Risk 5: Prescription slip HTML print template.** Browser print is finicky.

**Mitigation:** Base directly on the existing `/api/invoice-print/[id]`
template that already prints cleanly.

---

## What this push does NOT include

To prevent scope creep:

- **Edit/delete closed visits** — Push #4
- **Return-for-sitting flow** (skip History on follow-ups) — Push #4
- **AI clinical notes drafting** — Push #4
- **WhatsApp integration** with appointments — Push #4
- **Patient-facing visual explainer** — Push #4
- **Refunds** — Push #4

These are listed so we don't accidentally pull them in mid-build.

---

## Ready to build?

Read this plan. Three things to confirm:

**A. The flow diagram matches what Dr. Shobhna described.** Particularly
the branching points and the universal Close-visit terminus.

**B. The file inventory looks correct.** Anything I missed? Anything that
seems unnecessary?

**C. The build order is acceptable.** Each day produces a landable
artifact. Day 1's migration is safe — production stays functional even
without the rest. If we have to pause mid-build, we can.

If yes to all three, I start writing the Day 1 deliverables and ship as
a zip.

If any concerns or changes — flag now, before the code is written.
