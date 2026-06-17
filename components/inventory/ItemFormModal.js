'use client'
import { useState } from 'react'

// Add OR edit an inventory item. Pass `item` prop to edit, omit for add.

const CATEGORIES = ['Medication', 'Consumable', 'Instrument', 'Other']
const UNITS = ['bottle', 'piece', 'pack', 'box', 'tube', 'strip', 'ml', 'g']

export default function ItemFormModal({ item, onClose, onSaved }) {
  const isEdit = !!item
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '',
    unit: item?.unit || '',
    unitCost: item?.unitCost ?? '',
    supplier: item?.supplier || '',
    minOrderQty: item?.minOrderQty ?? 5,
    trackExpiry: item?.trackExpiry !== false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm(function(p) { return { ...p, [field]: value } })
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const url = isEdit ? '/api/inventory/' + item.id : '/api/inventory'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || null,
          unit: form.unit.trim() || null,
          unitCost: form.unitCost === '' ? null : Number(form.unitCost),
          supplier: form.supplier.trim() || null,
          minOrderQty: Number(form.minOrderQty) || 0,
          trackExpiry: !!form.trackExpiry,
        }),
      })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) {
        setError('Failed: ' + (data.error || res.statusText))
        setSaving(false)
        return
      }
      if (onSaved) onSaved(data.item || { id: item?.id })
    } catch (e) {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-900">{isEdit ? 'Edit item' : 'Add inventory item'}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {isEdit ? 'Update catalog details. Batches stay unchanged.' : 'After adding, use "Restock" to add a batch with quantity, cost, and expiry.'}
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.name}
              onChange={function(e) { update('name', e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
              <select value={form.category}
                onChange={function(e) { update('category', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">—</option>
                {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Unit</label>
              <select value={form.unit}
                onChange={function(e) { update('unit', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">—</option>
                {UNITS.map(function(u) { return <option key={u} value={u}>{u}</option> })}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Default unit cost ₹</label>
              <input type="number" min={0} step="0.01" value={form.unitCost}
                onChange={function(e) { update('unitCost', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Min order qty</label>
              <input type="number" min={0} value={form.minOrderQty}
                onChange={function(e) { update('minOrderQty', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <p className="text-[10px] text-slate-400 mt-0.5">Alert when stock falls below</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Default supplier</label>
            <input type="text" value={form.supplier}
              onChange={function(e) { update('supplier', e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.trackExpiry}
                onChange={function(e) { update('trackExpiry', e.target.checked) }}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
              Track expiry on this item
            </label>
            <p className="text-[10px] text-slate-400 ml-6 mt-0.5">If on, expiry date is required when restocking.</p>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Add item')}
          </button>
        </div>
      </div>
    </div>
  )
}
