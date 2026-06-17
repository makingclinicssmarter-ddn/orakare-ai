'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RestockModal from './RestockModal'
import BatchAdjustModal from './BatchAdjustModal'
import ItemFormModal from './ItemFormModal'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  } catch (e) { return '—' }
}

function daysUntil(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  return Math.floor((d - now) / (1000 * 60 * 60 * 24))
}

function BatchStatusPill({ status, expiryDate }) {
  if (status === 'DEPLETED') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Depleted</span>
  if (status === 'EXPIRED') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">Expired</span>
  if (status === 'DAMAGED') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">Damaged</span>
  if (status === 'ACTIVE') {
    const days = daysUntil(expiryDate)
    if (days !== null && days < 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">Past expiry</span>
    if (days !== null && days < 30) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Expiring {days}d</span>
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Active</span>
  }
  return null
}

export default function ItemDetailView({ itemId }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRestock, setShowRestock] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [adjustBatch, setAdjustBatch] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/' + itemId)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(function() { load() }, [itemId])

  async function handleArchive() {
    if (!confirm('Archive this item? It will be hidden from search but history is preserved.')) return
    const res = await fetch('/api/inventory/' + itemId, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/inventory')
  }

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>
  if (!data) return <div className="text-sm text-red-600">Item not found</div>

  const item = data.item
  const summary = data.summary || {}
  const batches = item.batches || []
  const activeBatches = batches.filter(function(b) { return b.status === 'ACTIVE' && b.quantity > 0 })
  const historicalBatches = batches.filter(function(b) { return !(b.status === 'ACTIVE' && b.quantity > 0) })

  return (
    <div>
      {/* Header */}
      <div className="mb-1">
        <Link href="/dashboard/inventory" className="text-xs text-slate-500 hover:text-slate-700">← Inventory</Link>
      </div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{item.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {item.category || 'Uncategorised'}{item.supplier ? ' · ' + item.supplier : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={function() { setShowEdit(true) }}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Edit
          </button>
          <button onClick={handleArchive}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Archive
          </button>
          <button onClick={function() { setShowRestock(true) }}
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
            + Restock
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Active stock</div>
          <div className="text-xl font-semibold text-slate-900 mt-0.5">{summary.totalActive || 0}</div>
          <div className="text-[10px] text-slate-400">{item.unit || 'units'}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Min order qty</div>
          <div className="text-xl font-semibold text-slate-700 mt-0.5">{item.minOrderQty || 0}</div>
          <div className="text-[10px] text-slate-400">alert threshold</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Expiring (30d)</div>
          <div className={'text-xl font-semibold mt-0.5 ' + ((summary.totalAtRisk || 0) > 0 ? 'text-amber-700' : 'text-slate-700')}>
            {summary.totalAtRisk || 0}
          </div>
          <div className="text-[10px] text-slate-400">{item.unit || 'units'}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Expired stock</div>
          <div className={'text-xl font-semibold mt-0.5 ' + ((summary.expiredQty || 0) > 0 ? 'text-red-700' : 'text-slate-700')}>
            {summary.expiredQty || 0}
          </div>
          <div className="text-[10px] text-slate-400">{item.unit || 'units'}</div>
        </div>
      </div>

      {/* Active batches */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-medium text-slate-700">Active batches ({activeBatches.length})</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">FIFO order — oldest expiry dispensed first.</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Batch</th>
              <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Qty</th>
              <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Unit cost</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Expires</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Received</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Status</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {activeBatches.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-xs text-slate-400 py-6">No active batches. Click + Restock to add.</td></tr>
            ) : activeBatches.map(function(b) {
              return (
                <tr key={b.id} className="border-b border-slate-100">
                  <td className="py-2.5 px-4 text-sm text-slate-700">{b.batchCode || '—'}</td>
                  <td className="py-2.5 px-4 text-sm text-slate-900 text-right font-medium">{b.quantity}</td>
                  <td className="py-2.5 px-4 text-sm text-slate-600 text-right">₹{b.unitCost}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">{formatDate(b.expiryDate)}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-600">{formatDate(b.receivedDate)}</td>
                  <td className="py-2.5 px-4"><BatchStatusPill status={b.status} expiryDate={b.expiryDate} /></td>
                  <td className="py-2.5 px-4">
                    <button onClick={function() { setAdjustBatch(b) }}
                      className="text-xs text-slate-500 hover:text-indigo-700">Adjust</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Historical batches */}
      {historicalBatches.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-medium text-slate-700">Historical batches ({historicalBatches.length})</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Depleted, expired, or damaged. Kept for audit.</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Batch</th>
                <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Initial qty</th>
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Received</th>
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {historicalBatches.map(function(b) {
                return (
                  <tr key={b.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-4 text-sm text-slate-600">{b.batchCode || '—'}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-500 text-right">{b.initialQuantity}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-500">{formatDate(b.receivedDate)}</td>
                    <td className="py-2.5 px-4"><BatchStatusPill status={b.status} expiryDate={b.expiryDate} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showRestock && (
        <RestockModal
          item={item}
          onClose={function() { setShowRestock(false) }}
          onSaved={function() { setShowRestock(false); load() }}
        />
      )}
      {showEdit && (
        <ItemFormModal
          item={item}
          onClose={function() { setShowEdit(false) }}
          onSaved={function() { setShowEdit(false); load() }}
        />
      )}
      {adjustBatch && (
        <BatchAdjustModal
          batch={adjustBatch}
          onClose={function() { setAdjustBatch(null) }}
          onSaved={function() { setAdjustBatch(null); load() }}
        />
      )}
    </div>
  )
}
