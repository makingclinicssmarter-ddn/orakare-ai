# Push #3 Day 1 — Foundation

## What this delivers

Day 1 of Push #3. Schema + plumbing for the visit-flow redesign. **Safe to
land on production by itself** — no functional regression. None of the UI
changes from Days 2-5 yet.

## Files in this push

- `prisma/schema.prisma` — adds `Visit.outcome`, `Visit.advice`, `Visit.nextAppointmentDate`, `Visit.needsResolution`, `VisitOutcome` enum, `Clinic.charges`. One new index on `Visit(clinicId, needsResolution)`.
- `prisma/migrations/20260613060000_visit_outcome_and_clinic_charges/migration.sql` — additive migration. Backward compatible.
- `app/api/consultation/start/route.js` — new visits now get `needsResolution=true` so they trigger the close-resolve banner if not closed properly.
- `app/api/visits/[visitId]/route.js` — NEW. GET endpoint returning full visit graph. Used by Close screen (Day 3) and prescription slip (Day 5).
- `components/visits/UnresolvedVisitBanner.js` — NEW. Force-resolve UI shown on Records page.
- `app/dashboard/patients/[id]/page.js` — updated to render the banner.

## Plus the build plan

`PUSH-3-BUILD-PLAN.md` (in the zip) is the full design doc. Read it. If
anything in there is wrong, flag it before Day 2 starts.

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-day1/. .
```

Verify the schema diff:

```bash
git diff prisma/schema.prisma
```

You should see the Visit fields, VisitOutcome enum, and Clinic.charges added.

Run the migration locally:

```bash
npx prisma migrate deploy
npx prisma generate
```

The migration also runs an `UPDATE` to backfill `outcome` for historical
imported visits (TREATED if any sittings exist, otherwise ADVISED). This is
best-effort labelling and doesn't affect anything functional — just gives
the UI a sensible default to show.

## Local test

```bash
npm run dev
```

1. Open an existing patient — Records page should render normally (no
   banner expected because no patient has unresolved visits yet).
2. Manually trigger the banner for testing:

```sql
-- Pick any in-progress visit you don't mind manipulating
UPDATE "Visit"
SET "needsResolution" = true
WHERE id = '<some-visit-id>' AND status != 'COMPLETED';
```

3. Reload the patient's Records page. You should see the amber banner with
   a "Close visit →" button.
4. Clicking the button will 404 — that's expected. The Close screen is built
   on Day 3.
5. Undo the test mutation:

```sql
UPDATE "Visit" SET "needsResolution" = false WHERE id = '<some-visit-id>';
```

## Deploy to production

```bash
git add -A
git commit -m "Push #3 Day 1: visit outcome schema + unresolved-visit banner"
git push
```

Vercel auto-deploys. The migration runs as part of build (Prisma migrate
deploy on Vercel).

## What you should observe in production after deploy

- All historical imported visits now have `outcome=TREATED` or `ADVISED`
  set (backfilled by migration).
- No visit shows the banner because `needsResolution` defaults to `false`
  and the migration didn't flip it for any existing visit.
- New consultations started after the deploy will start with
  `needsResolution=true`. If Dr. Shobhna abandons one mid-flow (as she did
  earlier in the week), it'll show in the banner next time she opens that
  patient's Records page. That's the desired behavior.

## Known limitations on Day 1

- The banner's "Close visit →" button leads to a 404. Built on Day 3.
- New consultations still use the OLD linear flow today. The branching
  doesn't exist until Day 4.
- This means: if Dr. Shobhna starts a new consultation right after Day 1
  ships and abandons it, she'll see the banner on the Records page but
  cannot resolve it via the button. **For now, she should complete every
  consultation through the existing flow.** Day 4 fixes this.

## When to ship Day 2

After Day 1 is live and stable for a couple of hours. Day 2 builds the
clinic charges settings panel + inventory search endpoint — both are
isolated additions, no consultation flow changes.
