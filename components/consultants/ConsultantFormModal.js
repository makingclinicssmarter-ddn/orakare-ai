'use client'
import { useState } from 'react'

export default function ConsultantFormModal({ consultant, onClose, onSaved }) {
  const isEdit = !!consultant
  const [form, setForm] = useState({
    name: consultant?.name || '',
    specialization: consultant?.specialization || '',
    phone: consultant?.phone || '',
    email: consultant?.email || '',
    splitType: consultant?.splitType || '',
    splitValue: consultant?.splitValue ?? '',
    notes: consultant?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm(function(p) { return { ...p, [field]: value } })
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    if (form.splitType && (form.splitValue === '' || isNaN(Number(form.splitValue)))) {
      setError('Enter a default value for the chosen split type')
      return
    }
    setSaving(true)
    try {
      const url = isEdit ? '/api/consultants/' + consultant.id : '/api/consultants'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          specialization: form.specialization.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          splitType: form.splitType || null,
          splitValue: form.splitValue === '' ? null : Number(form.splitValue),
          notes: form.notes.trim() || null,
        }),
      })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) {
        setError('Failed: ' + (data.error || res.statusText))
        setSaving(false)
        return
      }
      if (onSaved) onSaved(data.consultant || { id: consultant?.id })
    } catch (e) {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-900">{isEdit ? 'Edit consultant' : 'Add consultant'}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Default split applies when assigning to a treatment. Per-treatment overrides allowed.
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={function(e) { update('name', e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Specialization</label>
              <input type="text" value={form.specialization} placeholder="e.g. Orthodontist"
                onChange={function(e) { update('specialization', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
              <input type="text" value={form.phone} onChange={function(e) { update('phone', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input type="text" value={form.email} onChange={function(e) { update('email', e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Default split type</label>
              <select value={form.splitType}
                onChange={function(e) { update('splitType', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">None</option>
                <option value="PERCENTAGE">Percentage of treatment</option>
                <option value="FIXED">Fixed amount per treatment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Default value {form.splitType === 'PERCENTAGE' ? '(%)' : form.splitType === 'FIXED' ? '(₹)' : ''}
              </label>
              <input type="number" min={0} value={form.splitValue}
                onChange={function(e) { update('splitValue', e.target.value) }}
                disabled={!form.splitType}
                placeholder={form.splitType === 'PERCENTAGE' ? '40' : form.splitType === 'FIXED' ? '2000' : ''}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} rows={2}
              onChange={function(e) { update('notes', e.target.value) }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
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
            {saving ? 'Saving…' : (isEdit ? 'Save' : 'Add')}
          </button>
        </div>
      </div>
    </div>
  )
}
