import Link from 'next/link'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import { computePatientFinances } from '@/lib/finance'

// Per-patient balance breakdown. Sums match the "Balance pending" card on
// the main dashboard and the "Pending dues" card on each patient's Records
// page. Use this page to audit the dashboard total — every row links to
// that patient so Dr. Shobhna can verify the math from source.

const IST = 'Asia/Kolkata'

function formatINR(n) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST })
}

export default async function BalancePage() {
  const { clinicId } = await getDoctorContext()
  if (!clinicId) redirect('/sign-in')

  // Same data shape as Records page — pulls Treatments, Receipts (with their
  // PaymentAllocations to distinguish stream), and Invoices. The finance
  // helper splits payments into treatment vs visit-charges so the totals
  // match each patient's Records page exactly.
  const patients = await db.patient.findMany({
    where: { clinicId, archivedAt: null },
    include: {
      treatments: { select: { estimate: true, discount: true } },
      receipts: {
        select: {
          amount: true,
          invoiceId: true,
          allocations: { select: { id: true } },
        },
      },
      invoices: { select: { total: true, balance: true, kind: true } },
      sittings: {
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  // Compute per-patient outstanding via the shared helper.
  // We show:
  //   - Treatment balance (the unpaid procedures)
  //   - Visit charges balance (unpaid invoices from Close screen)
  //   - Total = sum of both
  const rows = patients.map(function(p) {
    const fin = computePatientFinances(p)
    return {
      id: p.id,
      name: p.name,
      originalID: p.originalID,
      mobile: p.mobile,
      treatmentEstimate: fin.treatment.estimate,
      treatmentCollected: fin.treatment.collected,
      treatmentBalance: fin.treatment.balance,
      visitChargesBalance: fin.visitCharges.balance,
      totalBalance: fin.totalBalance,
      credit: fin.treatment.credit,
      lastSitting: p.sittings[0]?.date || null,
    }
  })

  // Show patients with any outstanding balance (treatment OR visit charges)
  const debtors = rows
    .filter(function(r) { return r.totalBalance > 0 })
    .sort(function(a, b) { return b.totalBalance - a.totalBalance })

  const totalOutstanding = debtors.reduce(function(s, r) { return s + r.totalBalance }, 0)

  // Credit balances (treatment stream only — visit charges don't generate credits)
  const creditors = rows
    .filter(function(r) { return r.credit > 0 })
    .sort(function(a, b) { return b.credit - a.credit })

  const totalCredit = creditors.reduce(function(s, r) { return s + r.credit }, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
        ← Back to dashboard
      </Link>

      <div className="mt-3 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-slate-900">Balance pending</h1>
          <p className="text-sm text-slate-500 mt-1">
            Per-patient outstanding amounts. Sum at the bottom matches the
            dashboard card.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total outstanding</div>
          <div className="text-2xl font-medium text-red-700 mt-0.5">{formatINR(totalOutstanding)}</div>
          <div className="text-xs text-slate-500 mt-0.5">across {debtors.length} patient{debtors.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      {/* Outstanding table */}
      <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
        {debtors.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No patients have outstanding dues. 🎉
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Tx balance</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Visit charges</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Total due</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Last sitting</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map(function(r) {
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link href={'/dashboard/patients/' + r.id} className="block">
                        <div className="text-sm font-medium text-slate-900 hover:text-indigo-700">
                          {r.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {r.originalID}{r.mobile ? ' · ' + r.mobile : ''}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-slate-700">{formatINR(r.treatmentBalance)}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-700">{formatINR(r.visitChargesBalance)}</td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-red-700">{formatINR(r.totalBalance)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{r.lastSitting ? formatDate(r.lastSitting) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="py-3 px-4 text-sm font-medium text-slate-700">Total ({debtors.length} patient{debtors.length === 1 ? '' : 's'})</td>
                <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                  {formatINR(debtors.reduce(function(s, r) { return s + r.treatmentBalance }, 0))}
                </td>
                <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                  {formatINR(debtors.reduce(function(s, r) { return s + r.visitChargesBalance }, 0))}
                </td>
                <td className="py-3 px-4 text-right text-sm font-medium text-red-700">{formatINR(totalOutstanding)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Credit balances — patients who overpaid */}
      {creditors.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-slate-700 mb-3">
            Credit balances ({creditors.length})
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Patients who have paid more than the current treatment estimate (e.g. advance
            payments, or treatments still being added). Total: <span className="text-green-700 font-medium">{formatINR(totalCredit)}</span>
          </p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Estimate</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Collected</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Credit</th>
                </tr>
              </thead>
              <tbody>
                {creditors.map(function(r) {
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <Link href={'/dashboard/patients/' + r.id} className="block">
                          <div className="text-sm font-medium text-slate-900 hover:text-indigo-700">{r.name}</div>
                          <div className="text-xs text-slate-400">{r.originalID}</div>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-700">{formatINR(r.treatmentEstimate)}</td>
                      <td className="py-3 px-4 text-right text-sm text-green-700">{formatINR(r.treatmentCollected)}</td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-green-700">+ {formatINR(r.credit)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6">
        <strong>Tx balance</strong> = unpaid treatments only (Treatment.estimate − discount, minus payments tagged to those treatments).
        <br /><strong>Visit charges</strong> = unpaid invoice balance from Close-visit screens (consultation, X-rays, dispensed items).
        <br /><strong>Total due</strong> = sum of both. Matches the &quot;Pending dues&quot; on each patient&apos;s Records page.
      </p>
    </div>
  )
}
