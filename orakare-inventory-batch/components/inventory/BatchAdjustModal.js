'use client'
import { useState } from 'react'

// Adjust a batch: mark as Expired, Damaged, or Correct quantity (physical recount).

export default function BatchAdjustModal({ batch, onClose, onSaved }) {
  const [action, setAction] = useState('expire')  // expire | damage | correct
  const [quantity, setQuantity] = useState(batch.quantity)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setError(null)
    if (action === 'correct') {
      const q = parseInt(quantity, 10)
      if (!Number.isFinite(q) || q < 0) { setError('Quantity must be 0 or positive integer'); return }
    }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory/batches/' + batch.id + '/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, quantity: action === 'correct' ? parseInt(quantity, 10) : undefined, reason: reason.trim() || null }),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-900">Adjust batch</h3>
          <p className="text-xs text-slate-500 mt-1">
            Current: <span className="font-medium text-slate-700">{batch.quantity}</span> remaining
            {batch.batchCode && <> · Batch {batch.batchCode}</>}
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Action</label>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                <input type="radio" name="adjAction" checked={action === 'expire'}
                  onChange={function() { setAction('expire') }}
                  className="mt-0.5 w-4 h-4 border-slate-300 text-red-600" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Mark expired</div>
                  <div className="text-xs text-slate-500">Remaining quantity set to 0. Batch no longer dispensable.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                <input type="radio" name="adjAction" checked={action === 'damage'}
                  onChange={function() { setAction('damage') }}
                  className="mt-0.5 w-4 h-4 border-slate-300 text-slate-600" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Mark damaged</div>
                  <div className="text-xs text-slate-500">Remaining quantity set to 0. Audit trail kept.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                <input type="radio" name="adjAction" checked={action === 'correct'}
                  onChange={function() { setAction('correct') }}
                  className="mt-0.5 w-4 h-4 border-slate-300 text-indigo-600" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Correct quantity</div>
                  <div className="text-xs text-slate-500">Physical recount — adjust to actual count.</div>
                </div>
              </label>
            </div>
          </div>

          {action === 'correct' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">New quantity</label>
              <input type="number" min={0} value={quantity}
                onChange={function(e) { setQuantity(e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Reason / note (optional)</label>
            <input type="text" value={reason}
              onChange={function(e) { setReason(e.target.value) }}
              placeholder="e.g. Found 2 broken bottles"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
            {saving ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
