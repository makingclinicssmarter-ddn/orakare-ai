'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

// Modal for applying an unallocated receipt to specific treatments.
// Loads when user clicks "Apply unallocated" on the Records page banner.

export default function ApplyUnallocatedModal({ open, onClose, receipts, activeTreatments, patientId }) {
  const router = useRouter()
  const [selectedReceiptId, setSelectedReceiptId] = useState('')
  const [allocations, setAllocations] = useState([])  // [{ treatmentId, amount }]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Initialise allocations whenever receipt selection changes
  useEffect(function() {
    if (!selectedReceiptId && receipts && receipts.length === 1) {
      setSelectedReceiptId(receipts[0].id)
    }
  }, [receipts])

  useEffect(function() {
    if (activeTreatments && activeTreatments.length > 0) {
      setAllocations(activeTreatments.map(function(t) { return { treatmentId: t.id, amount: 0 } }))
    }
  }, [activeTreatments])

  const selectedReceipt = receipts?.find(function(r) { return r.id === selectedReceiptId })
  const receiptAmount = selectedReceipt ? Number(selectedReceipt.amount) : 0
  const allocTotal = allocations.reduce(function(s, a) { return s + (Number(a.amount) || 0) }, 0)
  const diff = receiptAmount - allocTotal

  function updateAlloc(treatmentId, amt) {
    setAllocations(function(curr) {
      return curr.map(function(a) { return a.treatmentId === treatmentId ? { ...a, amount: Number(amt) } : a })
    })
  }

  async function handleApply() {
    setError(null)
    if (!selectedReceiptId) { setError('Pick a receipt to apply'); return }
    if (Math.abs(diff) > 0.5) {
      setError('Allocation total (' + formatINR(allocTotal) + ') must equal receipt amount (' + formatINR(receiptAmount) + ')')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/receipts/' + selectedReceiptId + '/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: allocations.filter(function(a) { return Number(a.amount) > 0 }),
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      onClose()
      router.refresh()
    } catch (e) {
      setError('Network error')
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-900">Apply unallocated payment</h3>
          <p className="text-sm text-slate-500 mt-1">
            Distribute an unallocated payment across the patient&apos;s active treatments.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Receipt picker (if more than one) */}
          {receipts && receipts.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Receipt to allocate</label>
              <div className="space-y-1.5">
                {receipts.map(function(r) {
                  return (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                      <input
                        type="radio"
                        name="receipt"
                        value={r.id}
                        checked={selectedReceiptId === r.id}
                        onChange={function() { setSelectedReceiptId(r.id) }}
                      />
                      <span className="text-slate-700">{formatINR(r.amount)} {r.paymentMode || ''}</span>
                      <span className="text-xs text-slate-400 ml-auto">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {receipts && receipts.length === 1 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
              Allocating <span className="font-medium">{formatINR(receiptAmount)} {selectedReceipt?.paymentMode}</span>
              <span className="text-xs text-slate-400 ml-2">({new Date(selectedReceipt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })})</span>
            </div>
          )}

          {/* Treatments + allocation amounts */}
          {(!activeTreatments || activeTreatments.length === 0) ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              No active treatments for this patient. Allocation isn&apos;t possible until a treatment is started.
            </div>
          ) : (
            <div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Allocate across</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs text-slate-500">Treatment</th>
                    <th className="text-right py-2 text-xs text-slate-500">Balance</th>
                    <th className="text-right py-2 text-xs text-slate-500 w-28">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTreatments.map(function(t) {
                    const row = allocations.find(function(a) { return a.treatmentId === t.id })
                    const v = row ? row.amount : 0
                    return (
                      <tr key={t.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2">
                          <div className="font-medium text-slate-800">{t.type}{t.area ? ' ' + t.area : ''}</div>
                          <div className="text-xs text-slate-400">paid {formatINR(t.paid)} of {formatINR(t.estimate)}</div>
                        </td>
                        <td className="py-2 text-right text-slate-700">{formatINR(t.balance)}</td>
                        <td className="py-2 text-right">
                          <input
                            type="number" min={0} max={t.balance} value={v}
                            onChange={function(e) { updateAlloc(t.id, e.target.value) }}
                            className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Allocation status */}
              <div className={
                'mt-3 text-xs px-3 py-2 rounded-md ' +
                (Math.abs(diff) <= 0.5 ? 'bg-green-50 text-green-800' : (diff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'))
              }>
                {Math.abs(diff) <= 0.5 && '✓ Fully allocated: ' + formatINR(allocTotal)}
                {diff > 0.5 && '⚠ ' + formatINR(diff) + ' of ' + formatINR(receiptAmount) + ' still to allocate'}
                {diff < -0.5 && '✗ Allocated ' + formatINR(allocTotal) + ' exceeds receipt ' + formatINR(receiptAmount)}
              </div>
            </div>
          )}

          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={saving || !selectedReceiptId || !activeTreatments?.length || Math.abs(diff) > 0.5}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300"
          >
            {saving ? 'Applying…' : 'Apply allocation'}
          </button>
        </div>
      </div>
    </div>
  )
}
