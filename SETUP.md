# OraKare Push #1 — Security + Correctness

This drop fixes four critical issues identified in the v1 review:

1. **Multi-tenancy enforced everywhere.** Every API route and dashboard page now scopes data by `clinicId`. A new helper, `lib/auth-helpers.js`, exposes `getDoctorContext`, `verifyVisitAccess`, `verifyPatientAccess`, and `verifyTreatmentItemsAccess`.
2. **`/api/invoice-print/[id]` is no longer public.** It now requires Clerk auth and clinic ownership.
3. **Race-free patient and invoice numbering.** A new `ClinicCounter` model + `lib/counter.js` use Prisma's atomic `upsert + increment` so concurrent registrations cannot collide.
4. **Clinical images are persisted.** A new `lib/storage.js` uploads images to Supabase Storage (private bucket `clinical-images`) and stores the path references in `ClinicalFindings.images`. The AI analysis route now authorises **before** any heavy work, validates image size/type, persists images in parallel, and retries Claude on transient errors.

## Deploy steps (in order)

### 1. Drop the files in

Unzip the archive at the root of your Next.js project. It mirrors your existing layout — every file is either new (`lib/auth-helpers.js`, `lib/counter.js`, `lib/storage.js`, the migration folder) or a drop-in replacement for an existing route/page.

### 2. Install the Supabase client

```bash
npm install @supabase/supabase-js
```

(Or `pnpm add` / `yarn add` depending on your package manager.)

### 3. Create the Supabase Storage bucket

In the Supabase dashboard for your project:

- Storage → New bucket
- Name: **`clinical-images`**
- Public bucket: **off** (private)
- Save

You do not need to write any RLS policies for the bucket. The server-side code uses the **service role key**, which bypasses RLS.

### 4. Add the environment variable

In your `.env.local` (and Vercel project settings):

```
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

You should already have `NEXT_PUBLIC_SUPABASE_URL` set. The service role key is in the same Supabase dashboard under Settings → API → service_role secret. **Never expose this key to the client.** It is only imported in `lib/storage.js`, which is only ever used server-side.

### 5. Run the migration

```bash
npx prisma migrate deploy
```

This applies `20260610120000_add_clinic_counter`, which:

- Creates the `ClinicCounter` table.
- Backfills `lastValue` for each clinic from the current `Patient` and `Invoice` counts.

For Dr. Shobhna's clinic with 44 patients, the backfill will set `PATIENT` `lastValue = 44`. The next call to `nextCounter()` returns 45 → `ORK-045`. No gaps, no collisions.

### 6. Regenerate the Prisma client

```bash
npx prisma generate
```

### 7. Verify before deploying to production

After running the migration locally, sanity check:

```sql
SELECT "clinicId", "kind", "lastValue" FROM "ClinicCounter";
```

The `lastValue` for `PATIENT` should equal `SELECT COUNT(*) FROM "Patient" WHERE "clinicId" = '<your clinic id>'`.

Same for `INVOICE`.

### 8. Smoke test

After deploying:

- Create a new patient — confirm the ID continues your existing sequence (e.g. `ORK-045`).
- Create a new invoice — confirm same.
- Run an AI image analysis — confirm in Supabase Storage that files appear under `clinics/<clinicId>/visits/<visitId>/`.
- Try to access `/api/invoice-print/<some-invoice-id>` without logging in — should now return `401`.
- (If you have any test account in a different clinic) Try to access a patient URL from a different clinic — should return 404 from `notFound()`.

## What's NOT in this push

These are intentionally deferred to Push #2 / #3 to keep this change reviewable:

- **Indexes** on foreign keys. Schema is unchanged apart from adding `ClinicCounter`. Indexes go in Push #2.
- **Clerk session claims** for doctorId/clinicId. Still one DB lookup per request via `getDoctorContext` for now.
- **DB connection pool config.** Verify your `DATABASE_URL` is pointing at the Supabase pooled (pgbouncer) endpoint separately.
- **AuditLog writes.** Schema-only for now. Push #3.
- **AI streaming.** Retry logic is in; streaming is Push #2.

## Files in this drop

```
lib/
  auth-helpers.js              [NEW]
  counter.js                   [NEW]
  storage.js                   [NEW]

prisma/
  schema.prisma                [REPLACE — only adds ClinicCounter model at end]
  migrations/
    20260610120000_add_clinic_counter/
      migration.sql            [NEW]

app/api/
  patients/route.js                                  [REPLACE]
  patients/edit/route.js                             [REPLACE]
  patients/[id]/ai-analysis/route.js                 [REPLACE]
  patients/[id]/exam-consent/route.js                [REPLACE]
  patients/[id]/examination/route.js                 [REPLACE]
  patients/[id]/medical-history/route.js             [REPLACE]
  patients/[id]/record/route.js                      [REPLACE]
  patients/[id]/treatment-consent/route.js           [REPLACE]
  patients/[id]/treatment-consent-bulk/route.js      [REPLACE]
  patients/[id]/treatment-plan/route.js              [REPLACE]
  invoice/route.js                                   [REPLACE]
  invoice-print/[id]/route.js                        [REPLACE]
  consultation/start/route.js                        [REPLACE]
  consultation/search/route.js                       [REPLACE]
  consultation/sitting/route.js                      [REPLACE]
  consultation/collect-payment/route.js              [REPLACE]

app/dashboard/
  patients/[id]/page.js                                            [REPLACE]
  patients/[id]/examination/page.js                                [REPLACE]
  patients/[id]/treatment/page.js                                  [REPLACE]
  patients/[id]/record/page.js                                     [REPLACE]
  consultation/[patientId]/[visitId]/start/page.js                 [REPLACE]
  consultation/[patientId]/[visitId]/examination/page.js           [REPLACE]
  consultation/[patientId]/[visitId]/treatment/page.js             [REPLACE]
  consultation/[patientId]/[visitId]/consent/page.js               [REPLACE]
  consultation/[patientId]/[visitId]/sittings/page.js              [REPLACE]
  consultation/[patientId]/[visitId]/summary/page.js               [REPLACE]
```

## Pattern reference

For any future route you write, the canonical pattern is:

```js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, verifyVisitAccess, unauthorized, forbidden } from '@/lib/auth-helpers'

export async function POST(request) {
  const { clinicId } = await getDoctorContext()
  if (!clinicId) return unauthorized()

  const body = await request.json()

  // Always verify any ID coming from the client belongs to this clinic
  const visit = await verifyVisitAccess(body.visitId, clinicId)
  if (!visit) return forbidden('Visit not in your clinic')

  // Multi-step state changes wrapped in db.$transaction
  const result = await db.$transaction(async (tx) => {
    // ...
  })

  return NextResponse.json({ result }, { status: 200 })
}
```

For server-component pages:

```js
import { getDoctorContext } from '@/lib/auth-helpers'
import { notFound, redirect } from 'next/navigation'

export default async function Page(props) {
  const { clinicId } = await getDoctorContext()
  if (!clinicId) redirect('/sign-in')

  const record = await db.someModel.findFirst({
    where: { id, clinicId },  // ← always clinic-scope
    // ...
  })
  if (!record) notFound()

  // ...
}
```
