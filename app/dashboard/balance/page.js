import Link from 'next/link'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'

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

  // Same data shape as Records page — pulls Treatments and Receipts per
  // patient so the math here is identical to what each patient's Records
  // page shows. Archived patients excluded — they shouldn't have active dues.
  const patients = await db.patient.findMany({
    where: { clinicId, archivedAt: null },
    include: {
      treatments: { select: { estimate: true, discount: true } },
      receipts: { select: { amount: true } },
      sittings: {
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  // Compute per-patient outstanding
  const rows = patients.map(function(p) {
    const totalEstimate = p.treatments.reduce(function(s, t) {
      return s + (t.estimate || 0) - (t.discount || 0)
    }, 0)
    const totalCollected = p.receipts.reduce(function(s, r) {
      return s + (r.amount || 0)
    }, 0)
    const outstanding = Math.max(0, totalEstimate - totalCollected)
    const credit = Math.max(0, totalCollected - totalEstimate)
    const lastSitting = p.sittings[0]?.date || null
    return {
      id: p.id,
      name: p.name,
      originalID: p.originalID,
      mobile: p.mobile,
      totalEstimate,
      totalCollected,
      outstanding,
      credit,
      lastSitting,
    }
  })

  // Filter to those who actually owe + sort by outstanding descending
  const debtors = rows
    .filter(function(r) { return r.outstanding > 0 })
    .sort(function(a, b) { return b.outstanding - a.outstanding })

  const totalOutstanding = debtors.reduce(function(s, r) { return s + r.outstanding }, 0)

  // Bonus: patients with credit balance (paid more than estimate)
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
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Estimate</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Collected</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Outstanding</th>
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
                    <td className="py-3 px-4 text-right text-sm text-slate-700">{formatINR(r.totalEstimate)}</td>
                    <td className="py-3 px-4 text-right text-sm text-green-700">{formatINR(r.totalCollected)}</td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-red-700">{formatINR(r.outstanding)}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{r.lastSitting ? formatDate(r.lastSitting) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="py-3 px-4 text-sm font-medium text-slate-700">Total ({debtors.length} patient{debtors.length === 1 ? '' : 's'})</td>
                <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                  {formatINR(debtors.reduce(function(s, r) { return s + r.totalEstimate }, 0))}
                </td>
                <td className="py-3 px-4 text-right text-sm font-medium text-green-700">
                  {formatINR(debtors.reduce(function(s, r) { return s + r.totalCollected }, 0))}
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
                      <td className="py-3 px-4 text-right text-sm text-slate-700">{formatINR(r.totalEstimate)}</td>
                      <td className="py-3 px-4 text-right text-sm text-green-700">{formatINR(r.totalCollected)}</td>
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
        Calculation: <code className="bg-slate-100 px-1 rounded">outstanding = max(0, sum(Treatment.estimate − discount) − sum(Receipt.amount))</code>.
        Same formula as the &quot;Pending dues&quot; card on each patient&apos;s Records page.
      </p>
    </div>
  )
}
