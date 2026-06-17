'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Push #6: Edit the estimated cost of a treatment. Useful when the doctor
// re-diagnoses mid-treatment and the actual cost differs from the original
// estimate. Balance recomputes from estimate − discount − allocations.

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function EditEstimateButton({ treatment, currentEstimate, alreadyPaid }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [estimate, setEstimate] = useState(Math.round(Number(currentEstimate) || 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setError(null)
    const n = Number(estimate)
    if (!Number.isFinite(n) || n < 0) { setError('Enter a valid amount (₹0 or higher)'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/treatments/' + treatment.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimate: n }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError('Network error')
      setSaving(false)
    }
  }

  const paidSoFar = Number(alreadyPaid) || 0
  const newBalance = Math.max(0, Number(estimate) - paidSoFar)
  const isIncrease = Number(estimate) > Number(currentEstimate)
  const isDecrease = Number(estimate) < Number(currentEstimate)

  return (
    <>
      <button
        onClick={function() { setOpen(true) }}
        className="text-xs text-slate-400 hover:text-indigo-700 underline decoration-dotted underline-offset-2"
        title="Edit estimated cost"
      >
        edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-900">Edit estimate</h3>
              <p className="text-xs text-slate-500 mt-1">
                Update if the actual cost has changed (re-diagnosis, scope change, etc.). Balance recomputes automatically.
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="text-slate-400">Current estimate</div>
                  <div className="text-sm font-medium text-slate-700 mt-0.5">{formatINR(currentEstimate)}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <div className="text-slate-400">Already paid</div>
                  <div className="text-sm font-medium text-green-700 mt-0.5">{formatINR(paidSoFar)}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">New estimate ₹</label>
                <input
                  type="number" min={0} step="1" value={estimate}
                  onChange={function(e) { setEstimate(Number(e.target.value)) }}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  autoFocus
                />
              </div>

              <div className={'rounded-lg p-3 text-sm ' + (
                isIncrease ? 'bg-amber-50 border border-amber-100 text-amber-800'
                : isDecrease ? 'bg-blue-50 border border-blue-100 text-blue-800'
                : 'bg-slate-50 border border-slate-100 text-slate-600'
              )}>
                <div className="font-medium">
                  {isIncrease ? 'Estimate goes up' : isDecrease ? 'Estimate goes down' : 'No change'}
                </div>
                <div className="text-xs mt-1">
                  New balance will be <span className="font-medium">{formatINR(newBalance)}</span>
                  {newBalance < 0 && <span className="text-red-700"> (cannot go below zero)</span>}
                </div>
                {Number(estimate) < paidSoFar && (
                  <div className="text-xs text-red-700 mt-1">
                    Patient has paid more than this new estimate. They may be entitled to a refund — handle separately.
                  </div>
                )}
              </div>

              {error && <div className="text-xs text-red-600">{error}</div>}
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={function() { setOpen(false) }} disabled={saving}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || Number(estimate) === Number(currentEstimate)}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
                {saving ? 'Saving…' : 'Update estimate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
