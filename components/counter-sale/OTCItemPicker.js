'use client'

import { useState } from 'react'

/**
 * Inventory item picker for counter sale.
 *
 * Each line row: item name, qty, unit price (defaults to MRP), per-item discount, line total.
 * Line total = qty * (unitPrice - discount)   [discount is flat, not per-unit]
 *
 * value shape: [{ tempId, inventoryItemId, description, quantity, unitPrice, discount, stockQty }]
 */

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

function makeTempId() {
  return 'tmp_' + Math.random().toString(36).slice(2, 8)
}

export default function OTCItemPicker({ inventoryItems, value, onChange }) {
  const [q, setQ] = useState('')

  const filtered = q.trim()
    ? inventoryItems.filter(function(it) { return it.name.toLowerCase().includes(q.toLowerCase()) })
    : inventoryItems.slice(0, 10)

  function addItem(inv) {
    const already = value.find(function(v) { return v.inventoryItemId === inv.id })
    if (already) {
      onChange(value.map(function(v) {
        if (v.inventoryItemId !== inv.id) return v
        return { ...v, quantity: (Number(v.quantity) || 0) + 1 }
      }))
    } else {
      onChange(value.concat({
        tempId: makeTempId(),
        inventoryItemId: inv.id,
        description: inv.name,
        quantity: 1,
        unitPrice: inv.mrp || 0,
        discount: '',
        stockQty: inv.totalActive || 0,
        atRisk: inv.totalAtRisk || 0,
      }))
    }
    setQ('')
  }

  function updateRow(tempId, key, val) {
    onChange(value.map(function(v) {
      if (v.tempId !== tempId) return v
      return { ...v, [key]: val }
    }))
  }

  function removeRow(tempId) {
    onChange(value.filter(function(v) { return v.tempId !== tempId }))
  }

  const subtotal = value.reduce(function(s, v) {
    const qty = Number(v.quantity) || 0
    const price = Number(v.unitPrice) || 0
    const disc = Number(v.discount) || 0
    const lineTotal = Math.max(0, qty * price - disc)
    return s + lineTotal
  }, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Items</label>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text" value={q}
          onChange={function(e) { setQ(e.target.value) }}
          placeholder="Search inventory to add… (e.g. toothpaste)"
          className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        {q.trim() && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
            {filtered.map(function(it) {
              return (
                <button
                  key={it.id}
                  onClick={function() { addItem(it) }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{it.name}</div>
                      <div className="text-xs text-slate-500">
                        Stock: {it.totalActive} {it.unit || ''}
                        {it.totalAtRisk > 0 ? (' · ' + it.totalAtRisk + ' expiring') : ''}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 font-medium">{formatINR(it.mrp)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        {q.trim() && filtered.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs text-slate-400 z-10">
            No matching item in stock. Restock or check inventory.
          </div>
        )}
      </div>

      {/* Table */}
      {value.length === 0 ? (
        <div className="text-sm text-slate-400 italic py-4">No items yet. Search above to add.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide">Item</th>
              <th className="text-right py-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide" style={{ width: 80 }}>Qty</th>
              <th className="text-right py-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide" style={{ width: 100 }}>MRP</th>
              <th className="text-right py-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide" style={{ width: 100 }}>Discount</th>
              <th className="text-right py-2 text-[10px] font-medium text-slate-500 uppercase tracking-wide" style={{ width: 100 }}>Total</th>
              <th style={{ width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {value.map(function(v) {
              const qty = Number(v.quantity) || 0
              const price = Number(v.unitPrice) || 0
              const disc = Number(v.discount) || 0
              const lineTotal = Math.max(0, qty * price - disc)
              const overStock = qty > (v.stockQty || 0)
              return (
                <tr key={v.tempId} className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    <div className="text-sm text-slate-900">{v.description}</div>
                    <div className={'text-[10px] mt-0.5 ' + (overStock ? 'text-red-600' : 'text-slate-400')}>
                      Stock: {v.stockQty || 0}{overStock ? ' — over stock!' : ''}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number" min={1} value={v.quantity}
                      onChange={function(e) { updateRow(v.tempId, 'quantity', e.target.value) }}
                      className={'w-full h-9 border rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-400 ' +
                        (overStock ? 'border-red-300' : 'border-slate-200')}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number" min={0} value={v.unitPrice}
                      onChange={function(e) { updateRow(v.tempId, 'unitPrice', e.target.value) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number" min={0} value={v.discount}
                      placeholder="0"
                      onChange={function(e) { updateRow(v.tempId, 'discount', e.target.value) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-sm text-slate-900 text-right font-medium">
                    {formatINR(lineTotal)}
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={function() { removeRow(v.tempId) }}
                      className="text-slate-400 hover:text-red-600 text-xs"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
            <tr>
              <td colSpan={4} className="pt-3 pr-2 text-right text-sm font-medium text-slate-700">Items subtotal</td>
              <td className="pt-3 px-2 text-right text-lg font-semibold text-slate-900">{formatINR(subtotal)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
