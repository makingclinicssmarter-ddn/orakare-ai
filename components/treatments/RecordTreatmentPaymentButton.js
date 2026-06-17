'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Push #6: Record a payment against a treatment that has outstanding balance.
// Works for IN_PROGRESS, PLANNED, AND COMPLETED treatments. The completion
// stamp doesn't lock financials.

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Other']

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function RecordTreatmentPaymentButton({ treatment, balance }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(Math.round(Number(balance) || 0))
  const [mode, setMode] = useState('Cash')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const outstanding = Math.max(0, Number(balance) || 0)
  if (outstanding <= 0.5) return null  // hidden when fully paid

  async function handleSave() {
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) { setError('Enter amount greater than zero'); return }
    if (amt > outstanding + 0.5) {
      setError('Amount exceeds outstanding ' + formatINR(outstanding))
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/treatments/' + treatment.id + '/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, mode, note, date }),
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

  const treatmentLabel = (treatment.type || 'Treatment') + (treatment.area ? ' ' + treatment.area : '')

  return (
    <>
      <button
        onClick={function() { setOpen(true) }}
        className="text-xs px-3 py-1.5 rounded-lg border border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium whitespace-nowrap"
      >
        Record payment
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-900">Record treatment payment</h3>
              <p className="text-sm text-slate-500 mt-1">
                For <span className="font-medium text-slate-700">{treatmentLabel}</span> · outstanding <span className="font-medium text-red-700">{formatINR(outstanding)}</span>
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount received <span className="text-red-400">*</span></label>
                <input
                  type="number" min={1} max={outstanding} value={amount}
                  onChange={function(e) { setAmount(Number(e.target.value)) }}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {Number(amount) > 0 && Number(amount) < outstanding && (
                  <p className="text-xs text-amber-700 mt-1">
                    After this, {formatINR(outstanding - Number(amount))} will remain outstanding.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Mode</label>
                  <select
                    value={mode} onChange={function(e) { setMode(e.target.value) }}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date received</label>
                  <input
                    type="date" value={date}
                    onChange={function(e) { setDate(e.target.value) }}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Note (optional)</label>
                <input
                  type="text" value={note}
                  onChange={function(e) { setNote(e.target.value) }}
                  placeholder="e.g. Received in cash today"
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              {error && <div className="text-xs text-red-600">{error}</div>}
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={function() { setOpen(false) }} disabled={saving}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !amount || Number(amount) <= 0}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
                {saving ? 'Saving…' : 'Record ' + formatINR(amount || 0)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
