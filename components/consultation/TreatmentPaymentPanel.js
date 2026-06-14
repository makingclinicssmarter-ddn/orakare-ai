'use client'
import { useEffect } from 'react'

// Push #3.5 Zip 1.5: Reflowed for better breathing room.
// - Amount input + mode + Don't-allocate now on dedicated rows
// - Allocation table has clearer column spacing
// - Status messaging always visible below table (was below row)
//
// activeTreatments shape: [{ id, type, area, estimate, discount, paidSoFar, status }]

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Other']

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function TreatmentPaymentPanel({
  activeTreatments, amount, setAmount, mode, setMode,
  allocations, setAllocations, unallocated, setUnallocated,
}) {
  useEffect(function() {
    if (!activeTreatments || activeTreatments.length === 0) return
    if (allocations.length > 0) return
    setAllocations(activeTreatments.map(function(t) { return { treatmentId: t.id, amount: 0 } }))
  }, [activeTreatments])

  // Auto-distribute the payment when:
  //  - user types an amount AND
  //  - the user hasn't checked "Don't allocate" AND
  //  - no manual allocation has been entered yet (all rows currently 0)
  //
  // Strategy: dump everything onto the SINGLE active treatment when there's
  // only one. When there are multiple, dump onto the first one with non-zero
  // balance (it's a hint; she can re-split before saving).
  useEffect(function() {
    if (unallocated) return
    if (!activeTreatments || activeTreatments.length === 0) return
    if (Number(amount) <= 0) return

    const currentTotal = allocations.reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
    if (currentTotal > 0) return  // user already manually allocated; don't override

    const target = activeTreatments.find(function(t) {
      const bal = (Number(t.estimate || 0) - Number(t.discount || 0)) - Number(t.paidSoFar || 0)
      return bal > 0
    }) || activeTreatments[0]

    setAllocations(function(curr) {
      return curr.map(function(a) {
        return a.treatmentId === target.id ? { ...a, amount: Number(amount) } : a
      })
    })
  }, [amount, unallocated, activeTreatments])

  function updateAllocation(treatmentId, amt) {
    setAllocations(function(curr) {
      const existing = curr.find(function(a) { return a.treatmentId === treatmentId })
      if (existing) {
        return curr.map(function(a) { return a.treatmentId === treatmentId ? { ...a, amount: Number(amt) } : a })
      }
      return curr.concat({ treatmentId, amount: Number(amt) })
    })
  }

  const allocTotal = allocations.reduce(function(s, a) { return s + (Number(a.amount) || 0) }, 0)
  const allocDiff = Number(amount) - allocTotal

  // Empty state — no active treatments yet (e.g. consent screen for a freshly-planned treatment)
  if (!activeTreatments || activeTreatments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm text-slate-500 mb-4">
          No running treatments yet. Any payment recorded here will be parked as unallocated and can be assigned later.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount received</label>
            <input
              type="number" min={0} value={amount}
              onChange={function(e) { setAmount(Number(e.target.value)); setUnallocated(true) }}
              placeholder="0"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Mode</label>
            <select
              value={mode} onChange={function(e) { setMode(e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">

      {/* Active treatments + allocation table */}
      <div>
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Active treatments</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 pr-3 text-xs font-medium text-slate-500">Treatment</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">Estimate</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">Paid</th>
                <th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500">Balance</th>
                <th className="text-right py-2.5 pl-3 text-xs font-medium text-slate-500 w-32">Allocate today</th>
              </tr>
            </thead>
            <tbody>
              {activeTreatments.map(function(t) {
                const est = Number(t.estimate || 0) - Number(t.discount || 0)
                const paid = Number(t.paidSoFar || 0)
                const bal = Math.max(0, est - paid)
                const row = allocations.find(function(a) { return a.treatmentId === t.id })
                const allocAmt = row ? row.amount : 0
                return (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-slate-800">{t.type}{t.area ? ' ' + t.area : ''}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{t.status === 'IN_PROGRESS' ? 'In progress' : 'Planned'}</div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatINR(est)}</td>
                    <td className="py-3 px-3 text-right text-green-700">{formatINR(paid)}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{formatINR(bal)}</td>
                    <td className="py-3 pl-3 text-right">
                      <input
                        type="number" min={0} value={allocAmt} disabled={unallocated}
                        onChange={function(e) { updateAllocation(t.id, e.target.value) }}
                        className="w-full h-9 border border-slate-200 rounded-md px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment received — own row, generous spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount received</label>
          <input
            type="number" min={0} value={amount} onChange={function(e) { setAmount(Number(e.target.value)) }}
            placeholder="0"
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Mode</label>
          <select
            value={mode} onChange={function(e) { setMode(e.target.value) }}
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
          </select>
        </div>
      </div>

      {/* Don't-allocate toggle */}
      <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox" checked={unallocated} onChange={function(e) { setUnallocated(e.target.checked) }}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
        />
        <span>
          <span className="font-medium">Don&apos;t allocate now</span>
          <span className="text-xs text-slate-500 block mt-0.5">
            Record the payment as unallocated. You can assign it to a treatment later from the patient&apos;s records page.
          </span>
        </span>
      </label>

      {/* Allocation status — always shown when amount > 0 */}
      {Number(amount) > 0 && !unallocated && (
        <div className={
          'text-xs px-3 py-2 rounded-md ' +
          (Math.abs(allocDiff) <= 0.5
            ? 'bg-green-50 text-green-800'
            : allocDiff > 0.5
              ? 'bg-amber-50 text-amber-800'
              : 'bg-red-50 text-red-800')
        }>
          {Math.abs(allocDiff) <= 0.5 && '✓ Allocated fully: ' + formatINR(allocTotal) + ' across ' + allocations.filter(function(a) { return a.amount > 0 }).length + ' treatment(s)'}
          {allocDiff > 0.5 && '⚠ ' + formatINR(allocDiff) + ' of ' + formatINR(amount) + ' not yet allocated. Split across the treatments above or check Don\'t allocate.'}
          {allocDiff < -0.5 && '✗ Allocated ' + formatINR(allocTotal) + ' exceeds payment ' + formatINR(amount)}
        </div>
      )}
      {Number(amount) > 0 && unallocated && (
        <div className="text-xs text-amber-800 bg-amber-50 px-3 py-2 rounded-md">
          {formatINR(amount)} will be saved as unallocated. Apply it to a treatment later from the records page.
        </div>
      )}
    </div>
  )
}
