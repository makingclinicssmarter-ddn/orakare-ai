'use client'
import { useState } from 'react'

// Restock: create a new batch + linked Expense entry in one transaction.

export default function RestockModal({ item, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    quantity: '',
    unitCost: item.unitCost ?? '',
    expiryDate: '',
    receivedDate: today,
    batchCode: '',
    supplier: item.supplier || '',
    notes: '',
    createExpense: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm(function(p) { return { ...p, [field]: value } })
  }

  async function handleSave() {
    setError(null)
    const qty = parseInt(form.quantity, 10)
    if (!Number.isFinite(qty) || qty <= 0) { setError('Quantity must be a positive integer'); return }
    const cost = Number(form.unitCost)
    if (!Number.isFinite(cost) || cost < 0) { setError('Unit cost required'); return }
    if (item.trackExpiry && !form.expiryDate) { setError('Expiry date required for this item'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/inventory/' + item.id + '/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty,
          unitCost: cost,
          expiryDate: item.trackExpiry ? form.expiryDate : null,
          receivedDate: form.receivedDate,
          batchCode: form.batchCode.trim() || null,
          supplier: form.supplier.trim() || null,
          notes: form.notes.trim() || null,
          createExpense: !!form.createExpense,
        }),
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

  const totalCost = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-900">Restock {item.name}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Creates a new batch. {form.createExpense ? 'A linked expense entry is also created.' : 'No expense will be recorded.'}
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Quantity <span className="text-red-400">*</span></label>
              <input type="number" min={1} value={form.quantity}
                onChange={function(e) { update('quantity', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Unit cost ₹ <span className="text-red-400">*</span></label>
              <input type="number" min={0} step="0.01" value={form.unitCost}
                onChange={function(e) { update('unitCost', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Expiry date {item.trackExpiry && <span className="text-red-400">*</span>}
              </label>
              <input type="date" value={form.expiryDate}
                onChange={function(e) { update('expiryDate', e.target.value) }}
                disabled={!item.trackExpiry}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400" />
              {!item.trackExpiry && <p className="text-[10px] text-slate-400 mt-0.5">Expiry tracking off for this item</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Received date</label>
              <input type="date" value={form.receivedDate}
                onChange={function(e) { update('receivedDate', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Batch code</label>
              <input type="text" value={form.batchCode}
                onChange={function(e) { update('batchCode', e.target.value) }}
                placeholder="optional"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Supplier</label>
              <input type="text" value={form.supplier}
                onChange={function(e) { update('supplier', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} rows={2}
              onChange={function(e) { update('notes', e.target.value) }}
              placeholder="e.g. Received with damaged outer packaging"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.createExpense}
                onChange={function(e) { update('createExpense', e.target.checked) }}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              Record a linked expense (₹{(totalCost || 0).toLocaleString('en-IN')})
            </label>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.quantity || !form.unitCost}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
            {saving ? 'Saving…' : 'Restock + ' + (form.createExpense ? 'log expense' : 'no expense')}
          </button>
        </div>
      </div>
    </div>
  )
}
