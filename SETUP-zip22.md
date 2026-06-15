# Push #3.5 — Zip 2.2 (final touch on payment allocation UX)

One file changed. Fixes the auto-allocate bug discovered in Zip 2.1 testing.

## The bug

Typing "1500" in the Amount received field, with auto-fill watching every
keystroke, did this:
- Type `1` → amount=1, allocation auto-fills 1
- Type `5` → amount=15, but the effect skipped because currentTotal > 0
- Type `0` → amount=150, still skipped (currentTotal=1)
- Type `0` → amount=1500, still skipped

Result: payment field shows ₹1500 but allocation row shows ₹1. Save would
either fail validation (under-allocation guard) or persist a ₹1 allocation
with ₹1499 unaccounted for.

## The fix

**Removed the auto-allocate-on-keystroke useEffect entirely.**

**Added an explicit "Allocate full ₹X to <treatment>" button** that
appears below the payment input when:
- amount > 0
- "Don't allocate now" is NOT checked

The button label shows the actual amount typed and the target treatment.
One click → full allocation, predictable, no surprises.

Under-allocation guard from Zip 2.1 stays in place. If she types ₹2000
and doesn't click the button (so allocation stays at ₹0) and doesn't
check "Don't allocate now", save refuses with: "Only ₹0 of ₹2000 is
allocated..."

## Files

```
MODIFIED:
  components/consultation/TreatmentPaymentPanel.js
```

## Deploy

```bash
cd /path/to/orakare-ai
cp -R ~/Downloads/orakare-push3-5-zip22/. .
npm run dev
```

## Re-test

### Test B (auto-allocate, this time properly)
1. Open Close screen on a patient with one active treatment + balance
2. Type `1500` in Amount received (type all 4 digits)
3. **Allocation row stays at ₹0** (no per-keystroke surprise)
4. Below the Mode dropdown, see button: "Allocate full ₹1,500 to <treatment name>"
5. Click button → allocation row fills with ₹1,500
6. Status box turns green "✓ Fully allocated"
7. Save & close → verify PaymentAllocation row of ₹1500 in DB

### Test B3 (under-allocation block — now testable)
1. On Close screen, type ₹2000 in Amount received
2. Don't click the Allocate button
3. Don't check "Don't allocate now"
4. Click Save & close
5. **Should see red error:** "Only ₹0 of ₹2000 is allocated. Allocate the full amount across treatments, or check 'Don't allocate now' to park it."
6. Either click Allocate button → save then works, OR check Don't allocate → save works (creates unallocated receipt)

### Test B (multi-treatment)
1. On Close screen with 2+ active treatments
2. Type ₹3000
3. Click Allocate button → fills the full amount onto FIRST treatment with positive balance
4. Manually edit allocation rows to split (e.g. 1500 + 1500)
5. Status box stays green if total = amount
6. Save → verify the manual split persists, not the auto-fill

## Deploy to production

```bash
git add -A
git commit -m "Push #3.5 Zip 2.2: explicit Allocate full button (replaces per-keystroke auto-fill)"
git push
```

## Test 3 patient (ORK-063) — no bug

Investigation closed. The patient has:
- One treatment: Tooth Extraction estimate ₹1,200
- One receipt of ₹1,200 with 1 allocation
- One receipt of ₹200 with invoice (visit charges)

Math is clean. The ₹1500 you saw earlier must have been from a different
patient or stale cache. Hard-refresh the page if you still see something
wrong.

## After Zip 2.2 deploys

Push #3.5 is COMPLETE. Final session state:
- Branching consultation outcomes (ADVISED/CONSENTED/TREATED)
- Dual-payment Close screen with explicit "Allocate full" button
- Treatments tab + per-treatment detail + return-for-sitting
- Mark complete with notes
- Prescription slip (A5)
- Apply unallocated
- Two-stream financials
- Auto-bootstrap TreatmentItem for legacy treatments
- IST timezone everywhere
- Lifecycle: PLANNED → IN_PROGRESS → COMPLETED
