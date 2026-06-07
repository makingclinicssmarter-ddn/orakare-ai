# OraKare AI — Build Documentation

## Product vision
A comprehensive AI-powered dental clinic management system that replaces Google Sheets with a proper database, adds clinical AI intelligence (image analysis, dental chart, treatment planning), and prepares clinics for mandatory ABHA compliance.

**Primary user:** Dr. Shobhna Bansal's dental clinic, Dehradun
**Target market:** Dental clinics using Google Sheets or basic HMS in India

---

## Architecture

**Frontend:** Next.js 16 (App Router), Tailwind CSS, React
**Backend:** Next.js API routes (serverless)
**Database:** PostgreSQL via Supabase, managed with Prisma 5
**AI:** Anthropic Claude Sonnet (claude-sonnet-4-6) for image analysis and treatment planning
**Auth:** Clerk
**Deployment:** Vercel
**Repo:** https://github.com/makingclinicssmarter-ddn/orakare-ai
**Live URL:** https://orakare-rf8hu4kcb-raghava-s-projects4.vercel.app

---

## Key decisions made

### Why Option B (full PMS rebuild) not Option A (import only)
Her Google Sheets PMS has 9 modules. Option A only handles patients. Option B migrates everything into Supabase and adds AI on top — she retires Sheets completely.

### Why doctor findings take priority over AI
When AI suggests a finding for a tooth already marked by the doctor, AI does NOT overwrite. Doctor findings are always authoritative. AI flags conflicts with an amber chip.

### Why consolidated treatment consent (not per-procedure)
For a clinic with 5-6 procedures per patient, individual signing per procedure is too slow. One consolidated consent page lists all procedures, patient signs once.

## Insights from existing PMS (v2)

The existing system (Google Sheets + Apps Script) reveals critical UX patterns
her staff uses daily. These must be replicated for smooth migration.

### UX patterns to replicate
- **Live patient search** — searches name, phone, patient ID with instant dropdown
- **Sitting billing bar** — real-time panel showing estimate, collected, today paid, balance due
- **Treatment history panels** — medical/dental/personal history shown side by side before treatment
- **Multi-treatment entry** — multiple treatments in one session (e.g. RCT + filling same visit)
- **Revenue split preview** — live calculation when assigning consultant to treatment
- **WhatsApp notifications** — Hindi + English messages for 5 scenarios (appointment, follow-up, check-in, review, overdue)
- **Dashboard alerts** — low stock, expiring items, pending fees, overdue patients

### Services list (use exactly)
Free Dental Check-Up & X-Ray, Scaling & Polishing, Root Canal Treatment (RCT),
Tooth Extraction, Composite Filling, Crown / Cap Placement, Dental Implant,
Teeth Whitening, Braces / Orthodontic, Consultation, Other

### ID format (preserve for migration)
- Patients: ORK-001, ORK-002...
- Treatments: ORK-001-T01, ORK-001-T02...
- Sittings: ORK-001-T01-S1, S2, S3...

### Two invoice types needed
- Clinical invoice — auto-populated from treatments and sittings
- Commercial invoice — manual entry for implants, lab work, prosthetics

### Revised build priority
1. Records view (patient history + treatments + sittings + balance)
2. Treatments module (multi-treatment + consultant split)
3. Sittings module (billing bar)
4. WhatsApp notifications (Hindi + English)
5. Invoice (clinical + commercial)
6. Finance (with charts)
7. Consultants + fee ledger
8. Inventory
9. Expenses

### Why FHIR-ready but not FHIR-native for MVP
Full FHIR compliance requires HIU/HIP registration with NHA. Instead, data is stored in a structure that maps cleanly to FHIR R4 resources. When ABHA registration happens, it becomes a mapping exercise not a rewrite.

### Why Prisma 5 not Prisma 7
Prisma 7 changed connection URL management to prisma.config.ts with adapters. This conflicted with Vercel's build pipeline. Prisma 5 is stable, widely supported, and works perfectly.

### Pediatric dental chart
Three chart modes: Primary (under 6, 20 milk teeth FDI 51-85), Mixed (6-12, both sets shown), Adult (13+, 32 permanent teeth). Auto-detected from patient age, manual override available.

---

## Database schema (25 tables)

### Clinical modules (built in OraKare)
- `Clinic` — clinic profile
- `Doctor` — doctors linked to clinic
- `Patient` — patient demographics + ABHA ID
- `Visit` — each patient visit with status tracking
- `MedicalHistory` — chief complaint, conditions, allergies, medications
- `ExamConsent` — digital signature for examination consent
- `ClinicalFindings` — tooth findings (JSON), AI suggestions (JSON), clinical notes
- `Diagnosis` — ICD-coded diagnoses
- `TreatmentPlan` — approved treatment plan
- `TreatmentItem` — individual procedures with consent status
- `ClinicalRecord` — locked FHIR-ready record with audit log
- `FollowUp` — follow-up scheduling
- `Communication` — WhatsApp/SMS sent to patient
- `AuditLog` — append-only audit trail

### PMS modules (migrated from Google Sheets)
- `Treatment` — treatment records with consultant split
- `Sitting` — per-session records with consumables and payment
- `Invoice` — billing with line items
- `InvoiceItem` — individual invoice line items
- `Receipt` — payment receipts
- `Consultant` — visiting consultants with revenue split config
- `FeeEntry` — consultant revenue split tracking
- `InventoryItem` — consumables stock management
- `Expense` — clinic expense tracking
- `Appointment` — scheduling with Google Calendar sync (Phase 2)

### Visit status flow
REGISTERED → HISTORY_TAKEN → EXAM_CONSENT_SIGNED → EXAMINATION_DONE
→ DIAGNOSIS_DONE → TREATMENT_PLANNED → TREATMENT_CONSENT_SIGNED → COMPLETED
---

## Modules built

### ✅ Phase 1 — Clinical AI layer (complete)

**Patient management**
- `app/dashboard/patients/page.js` — today's queue + all patients tab with search
- `components/patients/PatientQueue.js` — queue UI with status badges
- `components/patients/RegisterPatientForm.js` — slide-in registration form
- `app/api/patients/route.js` — patient creation API

**Patient detail flow**
- `app/dashboard/patients/[id]/page.js` — medical history + exam consent + navigation
- `components/patients/PatientProgress.js` — step progress bar at top of each page
- `components/patients/MedicalHistoryForm.js` — conditions, allergies, medications
- `components/patients/ExamConsent.js` — digital signature canvas
- `app/api/patients/[id]/medical-history/route.js`
- `app/api/patients/[id]/exam-consent/route.js`

**Examination**
- `app/dashboard/patients/[id]/examination/page.js`
- `components/patients/ExaminationView.js` — wrapper managing state between chart and AI
- `components/patients/DentalChart.js` — FDI chart, 3 modes (adult/primary/mixed)
- `components/patients/AIFindings.js` — image upload, AI analysis, confirm/reject per finding
- `app/api/patients/[id]/examination/route.js`
- `app/api/patients/[id]/ai-analysis/route.js` — Claude vision API with full context bundle

**Treatment planning**
- `app/dashboard/patients/[id]/treatment/page.js`
- `components/patients/TreatmentPlan.js` — AI-generated plan, doctor edits, consent
- `components/patients/TreatmentConsent.js` — consolidated digital + physical consent
- `app/api/patients/[id]/treatment-plan/route.js` — generate + save actions
- `app/api/patients/[id]/treatment-consent/route.js`
- `app/api/patients/[id]/treatment-consent-bulk/route.js`

**Clinical record**
- `app/dashboard/patients/[id]/record/page.js`
- `components/patients/ClinicalRecord.js` — record preview, lock functionality
- `app/api/patients/[id]/record/route.js` — generate + lock actions

### ✅ Phase 1 — PMS foundation (complete)

**Import tool**
- `app/dashboard/import/page.js`
- `components/import/PatientImport.js` — CSV upload, preview, duplicate detection
- `app/api/import/patients/route.js`
- 44 patients imported from Google Sheets

**Appointments**
- `app/dashboard/appointments/page.js` — calendar view by date
- `components/appointments/AppointmentCalendar.js` — monthly calendar + day view
- `components/appointments/AppointmentForm.js` — booking form (10:00-20:00 slots)
- `app/api/appointments/route.js` — POST (create) + PATCH (update status)

**Layout & navigation**
- `app/layout.js` — root layout with Inter font
- `app/dashboard/layout.js` — dashboard shell with sidebar
- `components/layout/Sidebar.js` — navigation with icons
- `app/dashboard/page.js` — dashboard home with stats and quick actions

---

## Modules to build

### ⬜ Phase 2 — Complete PMS

**Treatments module**
- View all treatments per patient
- Link to sittings and invoices
- Track treatment status

**Sittings module**
- Per-session records
- Consumables tracking
- Per-sitting payment recording

**Billing and invoicing**
- Generate invoices from treatments
- Track payments and balance
- Receipt generation

**Consultant management**
- Add/edit consultants
- Revenue split configuration
- Fee entry tracking

**Inventory management**
- Stock tracking with low stock alerts
- Expiry date tracking
- Supplier management

**Expense tracking**
- Clinic expenses by category
- Recurring expense support

**Analytics dashboard**
- Daily/monthly revenue
- Patient counts
- Treatment completion rates
- Consultant performance

**WhatsApp summaries**
- Post-visit summary to patient
- Treatment plan with costs
- Follow-up reminders

### ⬜ Phase 3 — Compliance & integrations

**Google Calendar sync**
- Two-way sync for appointments
- Block slots on website booking form
- OAuth flow for clinic's calendar

**ABHA integration**
- HIU/HIP registration with NHA
- FHIR R4 bundle push
- Consent manager API
- Patient ABHA ID creation flow

**HMS API bridge**
- For clinics with existing HMS
- Import/export compatibility

---

## AI context bundle (how AI analysis works)

When a doctor uploads an image, Claude receives:
{
patient_context: { age, gender, medical_history, chief_complaint },
imaging: { intraoral_photos, xrays },
clinical_context: { doctor_notes, existing_chart_markings }
}
AI returns structured JSON with tooth number, condition, confidence, and reasoning. Doctor confirms or rejects each suggestion individually. Every AI suggestion vs doctor decision is logged in the audit trail separately.

---

## Deployment

**Local dev:** `npm run dev` from `~/Desktop/orakare-ai`
**Deploy to production:** `vercel --prod --no-wait` from project root
**GitHub push:** `git add . && git commit -m "message" && git push`

**Environment variables needed:**
- `DATABASE_URL` — Supabase pooler URL (port 6543, pgbouncer=true)
- `DIRECT_URL` — Supabase direct URL (port 5432)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY`

---

## Known issues and workarounds

1. **Supabase free tier pauses** — project pauses after inactivity. Resume from Supabase dashboard before use.
2. **Prisma VS Code warnings** — extension shows errors about `url` in schema.prisma. These are false alarms from the extension thinking we're on Prisma 7. Migrations run fine.
3. **AI image analysis** — only accepts image/jpeg, image/png, image/gif, image/webp. Other formats return a 400 error.
4. **Audit log actorId** — currently not linked to doctor ID properly. To be fixed when doctor profile management is built.

---

## Clinic context

**Clinic:** Dr. Shobhna Bansal's dental clinic, Dehradun
**Previous system:** Google Sheets PMS with 9 modules
**Data migrated:** 44 patients imported
**Modules in her Sheets:** Patients, Treatments, Sittings, Invoices, Inventory, Consultants, FeeEntries, Expenses, Receipts, Bookings

---

*Last updated: June 2026*
*Built with: Arian (Additional General Manager, OFD) + Claude*

BUILD LIST:
- Dashboard with pie chart, line chart, alerts, overdue patients, quick actions
- WhatsApp notifications — Hindi + English, 5 message types, Dr. Shobhna Bansal signature
- Settings page — clinic profile, doctor name, Google Review URL, invoice prefix
- Patient edit — edit name, age, gender, mobile, address from Records page
- Invoice print — clean printable HTML via /api/invoice-print/[id]
- IST timezone fix — all date inputs use +05:30 offset
- Notifications module — 5 sections, collapsible, WhatsApp deep links

## Still pending
- Google Calendar sync (Phase 2)
- ABHA integration (Phase 3)  
- Clinical flow for imported patients (visitId fix)
- Google Review URL (she needs to share the link)
- Test full clinical flow end to end with new patient