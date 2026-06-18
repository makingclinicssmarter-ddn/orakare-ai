'use client'
import { useState, useEffect, useRef } from 'react'

// Search-based picker for inventory dispensing. Type a few characters →
// dropdown of matching items appears → click → adds row with default quantity
// 1, unit price from InventoryItem.unitCost, decrements stock on save.

export default function InventoryPicker({ items, setItems }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Debounced search
  useEffect(function() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search || search.length < 1) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async function() {
      setSearching(true)
      try {
        // Push #5: use the new /api/inventory endpoint (returns totalActive per item from batches)
        const res = await fetch('/api/inventory?q=' + encodeURIComponent(search))
        if (res.ok) {
          const data = await res.json()
          setResults(data.items || [])
        }
      } catch (e) {
        // silent
      } finally {
        setSearching(false)
      }
    }, 200)
    return function() { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // Click-outside to close dropdown
  useEffect(function() {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return function() { document.removeEventListener('mousedown', onClick) }
  }, [])

  function addItem(it) {
    setItems(function(curr) {
      return curr.concat({
        tempId: 'tmp_' + Math.random().toString(36).slice(2, 8),
        inventoryItemId: it.id,
        name: it.name,
        quantity: 1,
        unitPrice: it.unitCost || 0,
        discount: 0,
        stockQty: it.totalActive || 0,  // Push #5: batch sum, not stockQty legacy field
      })
    })
    setSearch('')
    setResults([])
    setShowResults(false)
  }

  function updateRow(tempId, key, value) {
    setItems(function(curr) {
      return curr.map(function(i) { return i.tempId === tempId ? { ...i, [key]: value } : i })
    })
  }

  function removeRow(tempId) {
    setItems(function(curr) { return curr.filter(function(i) { return i.tempId !== tempId }) })
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="text-sm font-medium text-slate-700 mb-3">Materials &amp; medicines</h2>

      {/* Search */}
      <div ref={containerRef} className="relative max-w-md mb-4">
        <input
          type="text"
          value={search}
          onChange={function(e) { setSearch(e.target.value); setShowResults(true) }}
          onFocus={function() { setShowResults(true) }}
          placeholder="Search materials & medicines by name…"
          className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {showResults && search.length >= 1 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {searching ? (
              <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">No matches</div>
            ) : (
              results.map(function(it) {
                const stock = it.totalActive || 0
                const low = stock < (it.minOrderQty || 5)
                return (
                  <button
                    key={it.id}
                    onClick={function() { addItem(it) }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-900">{it.name}</div>
                        <div className="text-xs text-slate-400">{it.category || ''} · ₹{it.unitCost || 0}</div>
                      </div>
                      <div className={'text-xs ' + (low ? 'text-red-600 font-medium' : 'text-slate-400')}>
                        {stock} {it.unit || ''} in stock
                        {it.totalAtRisk > 0 && <span className="ml-1 text-amber-600">⚠</span>}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No inventory items added.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-2 text-xs text-slate-500">Item</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-20">Qty</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-24">Unit ₹</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-28">Disc / unit</th>
              <th className="text-right py-2 px-2 text-xs text-slate-500 w-24">Net</th>
              <th className="py-2 px-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(function(i) {
              // Push #4: discount is now PER UNIT, not flat per line.
              // net = qty * (unitPrice - discountPerUnit)
              const netUnit = Math.max(0, Number(i.unitPrice || 0) - Number(i.discount || 0))
              const net = Number(i.quantity) * netUnit
              const overstock = Number(i.quantity) > Number(i.stockQty || 0)
              return (
                <tr key={i.tempId} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-sm text-slate-900">
                    {i.name}
                    {overstock && <span className="ml-2 text-xs text-red-600">⚠ exceeds stock ({i.stockQty})</span>}
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={1}
                      value={i.quantity}
                      onChange={function(e) { updateRow(i.tempId, 'quantity', Number(e.target.value)) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      value={i.unitPrice}
                      onChange={function(e) { updateRow(i.tempId, 'unitPrice', Number(e.target.value)) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      value={i.discount}
                      onChange={function(e) { updateRow(i.tempId, 'discount', Number(e.target.value)) }}
                      className="w-full h-9 border border-slate-200 rounded px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-right text-sm font-medium text-slate-700">₹{net.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right">
                    <button
                      onClick={function() { removeRow(i.tempId) }}
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
              <td colSpan={4} className="py-2 px-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Materials &amp; medicines sub-total</td>
              <td className="py-2 px-2 text-right text-sm font-semibold text-slate-900">
                ₹{items.reduce(function(s, it) {
                  const netUnit = Math.max(0, Number(it.unitPrice || 0) - Number(it.discount || 0))
                  return s + (Number(it.quantity) * netUnit)
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
