'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ItemFormModal from './ItemFormModal'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  } catch (e) { return '—' }
}

function StatusPill({ row }) {
  if (row.expiredQty > 0) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">Expired stock</span>
  }
  if (row.lowStock) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">Low stock</span>
  }
  if (row.totalAtRisk > 0) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Expiring soon</span>
  }
  if (row.totalActive > 0) {
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">OK</span>
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">Empty</span>
}

export default function InventoryListView() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (showInactive) params.set('showInactive', 'true')
      const res = await fetch('/api/inventory?' + params.toString())
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (e) {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(function() {
    const t = setTimeout(load, 200)
    return function() { clearTimeout(t) }
  }, [q, showInactive])

  const lowStockCount = items.filter(function(r) { return r.lowStock }).length
  const atRiskCount = items.filter(function(r) { return r.totalAtRisk > 0 }).length
  const expiredCount = items.filter(function(r) { return r.expiredQty > 0 }).length

  return (
    <div>
      {/* Summary alerts */}
      {(lowStockCount > 0 || atRiskCount > 0 || expiredCount > 0) && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {lowStockCount > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <div className="text-xs font-medium text-red-700">Low stock</div>
              <div className="text-lg font-semibold text-red-900 mt-0.5">{lowStockCount} item{lowStockCount > 1 ? 's' : ''}</div>
              <div className="text-[11px] text-red-600 mt-1">Below minimum reorder qty</div>
            </div>
          )}
          {atRiskCount > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <div className="text-xs font-medium text-amber-700">Expiring soon</div>
              <div className="text-lg font-semibold text-amber-900 mt-0.5">{atRiskCount} item{atRiskCount > 1 ? 's' : ''}</div>
              <div className="text-[11px] text-amber-600 mt-1">Has batches expiring within 30 days</div>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <div className="text-xs font-medium text-red-700">Expired stock</div>
              <div className="text-lg font-semibold text-red-900 mt-0.5">{expiredCount} item{expiredCount > 1 ? 's' : ''}</div>
              <div className="text-[11px] text-red-600 mt-1">Discard or mark damaged</div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or supplier..."
          value={q}
          onChange={function(e) { setQ(e.target.value) }}
          className="flex-1 min-w-[200px] h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={function(e) { setShowInactive(e.target.checked) }}
            className="w-3.5 h-3.5 rounded border-slate-300" />
          Show archived
        </label>
        <button onClick={function() { setShowAdd(true) }}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
          + Add item
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Item</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Stock</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Oldest expiry</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-xs text-slate-400 py-8">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-xs text-slate-400 py-8">No inventory items yet. Click + Add item to get started.</td></tr>
            ) : items.map(function(it) {
              return (
                <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <Link href={'/dashboard/inventory/' + it.id} className="block">
                      <div className="text-sm font-medium text-slate-900 hover:text-indigo-700">{it.name}</div>
                      {it.supplier && <div className="text-xs text-slate-400">{it.supplier}</div>}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{it.category || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className={'text-sm font-medium ' + (it.lowStock ? 'text-red-700' : 'text-slate-900')}>
                      {it.totalActive} {it.unit || ''}
                    </div>
                    {it.minOrderQty > 0 && (
                      <div className="text-[10px] text-slate-400">min {it.minOrderQty}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{formatDate(it.oldestExpiry)}</td>
                  <td className="py-3 px-4"><StatusPill row={it} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <ItemFormModal
          onClose={function() { setShowAdd(false) }}
          onSaved={function(item) { setShowAdd(false); router.push('/dashboard/inventory/' + item.id) }}
        />
      )}
    </div>
  )
}
