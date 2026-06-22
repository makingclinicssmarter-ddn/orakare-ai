'use client'
import { useState } from 'react'

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Other']

export default function RecordPayoutModal({ consultant, pendingTotal, pendingEntries, onClose, onSaved }) {
  const [amount, setAmount] = useState(Math.round(Number(pendingTotal) || 0))
  const [mode, setMode] = useState('Cash')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setError(null)
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) { setError('Enter amount greater than zero'); return }
    if (amt > pendingTotal + 0.5) { setError('Exceeds total pending ' + formatINR(pendingTotal)); return }

    setSaving(true)
    try {
      const res = await fetch('/api/consultants/' + consultant.id + '/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, mode, date, note }),
      })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) {
        setError('Failed: ' + (data.error || res.statusText))
        setSaving(false)
        return
      }
      if (onSaved) onSaved()
    } catch (e) {
      setError('Network error')
      setSaving(false)
    }
  }

  // Show preview of which entries this amount will cover (oldest-first)
  const sorted = (pendingEntries || []).slice().sort(function(a, b) {
    return new Date(a.createdAt) - new Date(b.createdAt)
  })
  let remaining = Number(amount) || 0
  const willPayCount = sorted.reduce(function(count, f) {
    const share = Number(f.consultantShare || 0)
    if (share <= remaining + 0.001) {
      remaining -= share
      return count + 1
    }
    return count
  }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-900">Record payout to {consultant.name}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Pending: <span className="font-medium text-amber-700">{formatINR(pendingTotal)}</span> across {sorted.length} entries
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Amount paid</label>
              <input type="number" min={0} max={pendingTotal} value={amount}
                onChange={function(e) { setAmount(Number(e.target.value)) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Mode</label>
              <select value={mode} onChange={function(e) { setMode(e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" value={date} onChange={function(e) { setDate(e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Note (optional)</label>
            <input type="text" value={note} onChange={function(e) { setNote(e.target.value) }}
              placeholder="e.g. UPI ref XYZ"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {Number(amount) > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-600">
                This will settle <span className="font-medium text-slate-900">{willPayCount} of {sorted.length}</span> pending fee entries (oldest first).
              </div>
              {willPayCount < sorted.length && (
                <div className="text-[10px] text-slate-400 mt-1">
                  Partial fee entries are not split. To settle the next entry, increase amount.
                </div>
              )}
            </div>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving}
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
  )
}
