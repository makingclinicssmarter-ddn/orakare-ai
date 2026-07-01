'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import PatientPicker from './PatientPicker'
import OTCItemPicker from './OTCItemPicker'

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Other']

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function CounterSaleForm({ inventoryItems }) {
  const router = useRouter()
  const [buyer, setBuyer] = useState({ mode: 'walkin', walkInName: '', walkInPhone: '' })
  const [items, setItems] = useState([])
  const [billDiscount, setBillDiscount] = useState('')
  const [payMode, setPayMode] = useState('Cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const itemsSubtotal = useMemo(function() {
    return items.reduce(function(s, v) {
      const qty = Number(v.quantity) || 0
      const price = Number(v.unitPrice) || 0
      const disc = Number(v.discount) || 0
      return s + Math.max(0, qty * price - disc)
    }, 0)
  }, [items])

  const billDiscountAmt = Math.max(0, Number(billDiscount) || 0)
  const grandTotal = Math.max(0, itemsSubtotal - billDiscountAmt)

  const canSave = items.length > 0 && grandTotal > 0 && !items.some(function(v) {
    return (Number(v.quantity) || 0) > (v.stockQty || 0)
  })

  async function handleSave() {
    setError(null)
    if (!canSave) {
      setError('Add at least one item within stock, and ensure total is above zero')
      return
    }
    setSaving(true)
    try {
      const payload = {
        patientId: buyer.mode === 'patient' ? (buyer.patient?.id || null) : null,
        walkInName: buyer.mode === 'walkin' ? (buyer.walkInName || '') : '',
        walkInPhone: buyer.mode === 'walkin' ? (buyer.walkInPhone || '') : '',
        items: items.map(function(v) {
          return {
            inventoryItemId: v.inventoryItemId,
            description: v.description,
            quantity: Number(v.quantity),
            unitPrice: Number(v.unitPrice),
            discount: Number(v.discount) || 0,
          }
        }),
        billDiscount: billDiscountAmt,
        payment: { amount: grandTotal, mode: payMode },
      }
      const res = await fetch('/api/counter-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) {
        setError(data.error || 'Failed to save sale')
        setSaving(false)
        return
      }
      setSuccess({ invoiceId: data.invoiceId, invoiceNo: data.invoiceNo, total: data.total })
    } catch (e) {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function startNewSale() {
    setBuyer({ mode: 'walkin', walkInName: '', walkInPhone: '' })
    setItems([])
    setBillDiscount('')
    setPayMode('Cash')
    setError(null)
    setSuccess(null)
    router.refresh()
  }

  if (success) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-slate-900 mb-1">Sale recorded</h2>
        <p className="text-sm text-slate-500 mb-1">{success.invoiceNo}</p>
        <p className="text-2xl font-semibold text-slate-900 my-3">{formatINR(success.total)}</p>
        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          <a
            href={'/api/invoice-print/' + success.invoiceId}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition"
          >
            Print receipt
          </a>
          <button
            onClick={startNewSale}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            New sale
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PatientPicker value={buyer} onChange={setBuyer} />
      <OTCItemPicker inventoryItems={inventoryItems} value={items} onChange={setItems} />

      {/* Bill discount + Payment */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Total &amp; payment</label>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Items subtotal</span>
            <span className="text-slate-900 font-medium">{formatINR(itemsSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-600">Additional bill discount</span>
            <input
              type="number" min={0} value={billDiscount}
              placeholder="0"
              onChange={function(e) { setBillDiscount(e.target.value) }}
              className="w-32 h-9 border border-slate-200 rounded-lg px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <span className="text-slate-900 font-semibold">Grand total</span>
            <span className="text-lg font-semibold text-slate-900">{formatINR(grandTotal)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Amount received</label>
            <input
              type="text"
              value={formatINR(grandTotal)}
              readOnly
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-slate-50 text-slate-900 font-medium"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Mode</label>
            <select
              value={payMode}
              onChange={function(e) { setPayMode(e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Counter sales are paid in full at time of sale.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition disabled:opacity-40"
        >
          {saving ? 'Saving…' : ('Record sale — ' + formatINR(grandTotal))}
        </button>
      </div>
    </div>
  )
}
