'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ChargesPanel from './ChargesPanel'
import InventoryPicker from './InventoryPicker'
import NextAppointmentPicker from './NextAppointmentPicker'

// Universal terminus for every visit, regardless of which path led here.
// Composes: outcome selection, charges, inventory, payment, advice,
// next appointment. One save = one transaction on the API side.

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Other']

function inferDefaultOutcome(v) {
  if (v.currentOutcome) return v.currentOutcome  // already saved
  if (v.hasConsentedItems) return 'TREATED'      // most common when consent signed
  if (v.hasTreatmentPlan) return 'ADVISED'       // plan made but not consented
  return 'ADVISED'                                // no plan at all
}

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function CloseVisitScreen({ visit, presets, initialAdvice, clinicId }) {
  const router = useRouter()
  const [outcome, setOutcome] = useState(inferDefaultOutcome(visit))
  const [advice, setAdvice] = useState(initialAdvice || '')
  const [charges, setCharges] = useState([])         // [{ tempId, label, category, amount, discount }]
  const [invItems, setInvItems] = useState([])       // [{ tempId, inventoryItemId, name, quantity, unitPrice, discount, stockQty }]
  const [totalDiscount, setTotalDiscount] = useState(0)
  const [payAmount, setPayAmount] = useState(0)
  const [payMode, setPayMode] = useState('Cash')
  const [nextApt, setNextApt] = useState(null)        // { date, slot } | null
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const totals = useMemo(function() {
    const chargesSubtotal = charges.reduce(function(s, c) { return s + (Number(c.amount) || 0) }, 0)
    const chargesDiscount = charges.reduce(function(s, c) { return s + (Number(c.discount) || 0) }, 0)
    const invSubtotal = invItems.reduce(function(s, i) { return s + (Number(i.quantity) * Number(i.unitPrice || 0)) }, 0)
    const invDiscount = invItems.reduce(function(s, i) { return s + (Number(i.discount) || 0) }, 0)
    const subtotal = chargesSubtotal + invSubtotal
    const lineDiscount = chargesDiscount + invDiscount
    const td = Number(totalDiscount) || 0
    const grand = Math.max(0, subtotal - lineDiscount - td)
    const paid = Number(payAmount) || 0
    const balance = grand - paid
    return { subtotal, lineDiscount, totalDiscount: td, grand, paid, balance }
  }, [charges, invItems, totalDiscount, payAmount])

  async function handleSave() {
    setError(null)
    if (!outcome) {
      setError('Pick a visit outcome before saving')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/consultation/visit/' + visit.id + '/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          advice: advice.trim(),
          charges: charges.map(function(c) {
            return { label: c.label, category: c.category || 'OTHER', amount: c.amount, discount: c.discount || 0 }
          }),
          inventoryItems: invItems.map(function(i) {
            return { inventoryItemId: i.inventoryItemId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount || 0 }
          }),
          payment: totals.paid > 0 ? { amount: totals.paid, mode: payMode } : null,
          totalDiscount: totals.totalDiscount,
          nextAppointment: nextApt,
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Save failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      // Successful close → route to patient records.
      // Day 5 will route to prescription slip print view instead.
      router.push('/dashboard/patients/' + visit.patient.id)
    } catch (e) {
      setError('Network error — try again')
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <h1 className="text-2xl font-medium text-slate-900">Close visit</h1>
      <p className="text-sm text-slate-500 mt-1">
        {visit.patient.name} · {visit.patient.age}y · {visit.patient.gender} · {visit.patient.originalID}
      </p>

      {/* Outcome selector */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Visit outcome</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { value: 'ADVISED', title: 'Advised only', desc: 'Examined, no treatment today' },
            { value: 'CONSENTED', title: 'Consented, deferred', desc: 'Plan agreed, sitting scheduled' },
            { value: 'TREATED', title: 'Consented & started', desc: 'First sitting done today' },
          ].map(function(o) {
            const selected = outcome === o.value
            return (
              <button
                key={o.value}
                onClick={function() { setOutcome(o.value) }}
                className={
                  'text-left rounded-lg border px-3 py-3 transition ' +
                  (selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50')
                }
              >
                <div className={'text-sm font-medium ' + (selected ? 'text-indigo-900' : 'text-slate-900')}>{o.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Charges + Inventory */}
      <ChargesPanel presets={presets} charges={charges} setCharges={setCharges} />

      <InventoryPicker items={invItems} setItems={setInvItems} />

      {/* Total discount + payment row */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Total discount (₹) — additional to per-item discounts
          </label>
          <input
            type="number"
            min={0}
            value={totalDiscount}
            onChange={function(e) { setTotalDiscount(Number(e.target.value)) }}
            className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Payment received</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={payAmount}
              onChange={function(e) { setPayAmount(Number(e.target.value)) }}
              placeholder="Amount"
              className="flex-1 h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={payMode}
              onChange={function(e) { setPayMode(e.target.value) }}
              className="h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
            </select>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Subtotal</div>
            <div className="font-medium text-slate-900 mt-0.5">{formatINR(totals.subtotal)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Per-item discount</div>
            <div className="font-medium text-slate-700 mt-0.5">− {formatINR(totals.lineDiscount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Total discount</div>
            <div className="font-medium text-slate-700 mt-0.5">− {formatINR(totals.totalDiscount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Grand total</div>
            <div className="font-medium text-slate-900 mt-0.5 text-base">{formatINR(totals.grand)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{totals.balance > 0 ? 'Balance due' : (totals.balance < 0 ? 'Advance' : 'Settled')}</div>
            <div className={'font-medium mt-0.5 text-base ' + (totals.balance > 0 ? 'text-red-700' : (totals.balance < 0 ? 'text-green-700' : 'text-slate-900'))}>
              {formatINR(Math.abs(totals.balance))}
            </div>
          </div>
        </div>
      </div>

      {/* Advice */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Advice (printed on prescription slip)</label>
        <textarea
          value={advice}
          onChange={function(e) { setAdvice(e.target.value) }}
          rows={3}
          placeholder="e.g., Warm saline rinses 3x/day for 5 days. Follow-up in 1 week."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Next appointment */}
      <NextAppointmentPicker value={nextApt} onChange={setNextApt} />

      {/* Action bar */}
      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-500">
          Saving will mark the visit closed and generate an invoice (if any charges).
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 font-medium"
          >
            {saving ? 'Saving…' : 'Save & close visit'}
          </button>
        </div>
      </div>
    </div>
  )
}
