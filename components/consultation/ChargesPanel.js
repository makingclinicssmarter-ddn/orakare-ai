'use client'
import { useState } from 'react'

// Presets from clinic settings appear as quick-add buttons.
// Each charge row also has per-line discount field.
// "+ Custom" lets her add a one-off charge that's not in presets.

function newCustomRow() {
  return {
    tempId: 'tmp_' + Math.random().toString(36).slice(2, 8),
    label: '',
    category: 'OTHER',
    amount: 0,
    discount: 0,
    custom: true,
  }
}

export default function ChargesPanel({ presets, charges, setCharges }) {
  const [search, setSearch] = useState('')

  const visiblePresets = (presets || []).filter(function(p) {
    if (!search) return true
    return p.label.toLowerCase().includes(search.toLowerCase())
  })

  function addFromPreset(p) {
    setCharges(function(curr) {
      return curr.concat({
        tempId: 'tmp_' + Math.random().toString(36).slice(2, 8),
        label: p.label,
        category: p.category || 'OTHER',
        amount: p.amount,
        discount: 0,
      })
    })
  }

  function addCustom() {
    setCharges(function(curr) { return curr.concat(newCustomRow()) })
  }

  // Push #7: round-off row — same structure as a custom charge, but with
  // a fixed "Round off" label and rendered as static text. Amount editable
  // (can be negative to subtract).
  function addRoundOff() {
    setCharges(function(curr) {
      return curr.concat({
        tempId: 'round_' + Math.random().toString(36).slice(2, 8),
        label: 'Round off',
        category: 'OTHER',
        amount: 0,
        discount: 0,
      })
    })
  }

  function updateRow(tempId, key, value) {
    setCharges(function(curr) {
      return curr.map(function(c) { return c.tempId === tempId ? { ...c, [key]: value } : c })
    })
  }

  function removeRow(tempId) {
    setCharges(function(curr) { return curr.filter(function(c) { return c.tempId !== tempId }) })
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h2 className="text-sm font-medium text-slate-700">Charges</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={addRoundOff}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            title="Add a round-off line (use a negative amount to subtract)"
          >
            + Round off
          </button>
          <button
            type="button"
            onClick={addCustom}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            + Custom charge
          </button>
        </div>
      </div>

      {/* Presets — quick add buttons */}
      {presets && presets.length > 0 ? (
        <div>
          <input
            type="text"
            value={search}
            onChange={function(e) { setSearch(e.target.value) }}
            placeholder="Filter presets…"
            className="w-full max-w-md h-9 border border-slate-200 rounded-lg px-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex flex-wrap gap-2 mb-4">
            {visiblePresets.map(function(p) {
              return (
                <button
                  key={p.id}
                  onClick={function() { addFromPreset(p) }}
                  className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                  title={p.category}
                >
                  + {p.label} · ₹{p.amount}
                </button>
              )
            })}
            {visiblePresets.length === 0 && (
              <span className="text-xs text-slate-400">No presets match.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 mb-4 text-xs text-slate-500">
          No charge presets configured yet. <a href="/dashboard/settings/clinic-charges" className="text-indigo-600 hover:underline">Add some →</a> or use Custom charge.
        </div>
      )}

      {/* Charge rows */}
      {charges.length === 0 ? (
        <p className="text-xs text-slate-400">No charges added yet.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-2 text-xs text-slate-500">Description</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-28">Amount</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-28">Discount</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-24">Net</th>
              <th className="py-2 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {charges.map(function(c) {
              const net = Number(c.amount || 0) - Number(c.discount || 0)
              return (
                <tr key={c.tempId} className="border-b border-slate-100">
                  <td className="py-2 px-2">
                    {c.custom ? (
                      <input
                        type="text"
                        value={c.label}
                        onChange={function(e) { updateRow(c.tempId, 'label', e.target.value) }}
                        placeholder="e.g. Suture removal"
                        className="w-full h-9 border border-slate-200 rounded px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    ) : (
                      <span className="text-sm text-slate-900">{c.label}</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={c.amount}
                      onChange={function(e) { updateRow(c.tempId, 'amount', Number(e.target.value)) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      value={c.discount}
                      onChange={function(e) { updateRow(c.tempId, 'discount', Number(e.target.value)) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-right text-sm font-medium text-slate-700">₹{net.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={function() { removeRow(c.tempId) }}
                      className="text-xs text-slate-400 hover:text-red-600 px-1"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200">
              <td colSpan={3} className="py-2 px-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Visit charges sub-total</td>
              <td className="py-2 px-2 text-right text-sm font-semibold text-slate-900">
                ₹{charges.reduce(function(s, c) {
                  return s + (Number(c.amount || 0) - Number(c.discount || 0))
                }, 0).toLocaleString('en-IN')}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  )
}
