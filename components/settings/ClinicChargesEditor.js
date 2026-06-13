'use client'
import { useState } from 'react'

// Editable list of charge presets. Add anytime, edit anytime, deactivate
// without delete (so old invoices reading them stay coherent).
//
// On Save, sends the entire list to PUT /api/clinics/[clinicId]/charges
// which replaces the stored array atomically.

const CATEGORIES = ['CONSULTATION', 'RADIOGRAPH', 'PROCEDURE', 'CONSUMABLE', 'OTHER']

function emptyRow() {
  return {
    id: 'chg_' + Math.random().toString(36).slice(2, 10),
    label: '',
    category: 'CONSULTATION',
    amount: 0,
    active: true,
  }
}

export default function ClinicChargesEditor({ clinicId, initialCharges }) {
  const [rows, setRows] = useState(initialCharges || [])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [dirty, setDirty] = useState(false)

  function update(i, key, value) {
    setRows(function(curr) {
      const next = curr.slice()
      next[i] = { ...next[i], [key]: value }
      return next
    })
    setDirty(true)
  }

  function addRow() {
    setRows(function(curr) { return curr.concat(emptyRow()) })
    setDirty(true)
  }

  function removeRow(i) {
    if (!confirm('Remove this charge? Past invoices keep their existing values; this only removes it from the quick-button list.')) return
    setRows(function(curr) { return curr.filter(function(_, idx) { return idx !== i }) })
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/clinics/' + clinicId + '/charges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charges: rows }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setMessage({ kind: 'error', text: 'Save failed: ' + (detail.error || res.statusText) })
        setSaving(false)
        return
      }
      const data = await res.json()
      setRows(data.charges)
      setDirty(false)
      setMessage({ kind: 'ok', text: 'Saved' })
    } catch (e) {
      setMessage({ kind: 'error', text: 'Network error — try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={addRow}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          + Add charge
        </button>
        <div className="flex items-center gap-3">
          {message && (
            <span className={'text-xs ' + (message.kind === 'ok' ? 'text-green-600' : 'text-red-600')}>
              {message.text}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 font-medium"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No charges configured yet. Click <span className="font-medium">+ Add charge</span> to start.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Label</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Amount (₹)</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Active</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(function(r, i) {
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.label}
                        onChange={function(e) { update(i, 'label', e.target.value) }}
                        placeholder="e.g. Consultation"
                        className="w-full h-9 border border-slate-200 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={r.category}
                        onChange={function(e) { update(i, 'category', e.target.value) }}
                        className="w-full h-9 border border-slate-200 rounded px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        {CATEGORIES.map(function(c) {
                          return <option key={c} value={c}>{c}</option>
                        })}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min={0}
                        value={r.amount}
                        onChange={function(e) { update(i, 'amount', Number(e.target.value)) }}
                        className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.active !== false}
                        onChange={function(e) { update(i, 'active', e.target.checked) }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={function() { removeRow(i) }}
                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Tip: Inactive charges stay in past invoices but don&apos;t appear as quick-buttons when closing a visit.
      </p>
    </div>
  )
}
