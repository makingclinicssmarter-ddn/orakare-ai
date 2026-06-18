'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ChargesPanel from './ChargesPanel'
import InventoryPicker from './InventoryPicker'
import NextAppointmentPicker from './NextAppointmentPicker'
import TreatmentPaymentPanel from './TreatmentPaymentPanel'

// Push #3.5 — universal close-visit screen, dual payment design.
// Two clearly-separated payment sections:
//   Section 1 (always shown) — Visit charges: consultation, X-ray, dispensed
//     items. Paid in full today. Generates an invoice (kind=VISIT_CHARGES).
//   Section 2 (optional) — Treatment payment: toward the patient's running
//     treatments. Manually allocated, or parked as "unallocated".

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Other']

function inferDefaultOutcome(v) {
  if (v.currentOutcome) return v.currentOutcome
  if (v.hasConsentedItems) return 'TREATED'
  if (v.hasTreatmentPlan) return 'ADVISED'
  return 'ADVISED'
}

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function CloseVisitScreen({ visit, presets, initialAdvice, clinicId, activeTreatments }) {
  const router = useRouter()
  const [outcome, setOutcome] = useState(inferDefaultOutcome(visit))
  const [advice, setAdvice] = useState(initialAdvice || '')

  // Visit-charges state
  const [charges, setCharges] = useState([])
  const [invItems, setInvItems] = useState([])
  // Push #7: totalDiscount state removed. Round-off handled as a charges line.
  const [vcPayAmount, setVcPayAmount] = useState(0)
  const [vcPayMode, setVcPayMode] = useState('Cash')

  // Treatment payment state
  const [tpAmount, setTpAmount] = useState(0)
  const [tpMode, setTpMode] = useState('Cash')
  const [tpAllocations, setTpAllocations] = useState([])  // [{ treatmentId, amount, discount }]
  const [tpUnallocated, setTpUnallocated] = useState(false)  // "Don't allocate" toggle

  // Push #4: which treatments should be marked complete on save.
  // Set of treatmentId strings. Driven by checkboxes above Save button.
  const [completedTreatmentIds, setCompletedTreatmentIds] = useState([])

  function toggleComplete(treatmentId) {
    setCompletedTreatmentIds(function(curr) {
      return curr.includes(treatmentId)
        ? curr.filter(function(id) { return id !== treatmentId })
        : curr.concat(treatmentId)
    })
  }

  const [nextApt, setNextApt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const vcTotals = useMemo(function() {
    // Push #7: clean separated math.
    // Charges line net: amount − discount (flat per row).
    // Inventory line net: qty × (unitPrice − discPerUnit).
    // Sub-totals shown separately, then combined.
    const chargesNet = charges.reduce(function(s, c) {
      return s + Math.max(0, (Number(c.amount) || 0) - (Number(c.discount) || 0))
    }, 0)
    const invNet = invItems.reduce(function(s, i) {
      const netUnit = Math.max(0, (Number(i.unitPrice) || 0) - (Number(i.discount) || 0))
      return s + (Number(i.quantity) || 0) * netUnit
    }, 0)
    const grand = chargesNet + invNet
    const paid = Number(vcPayAmount) || 0
    const balance = grand - paid
    return { chargesNet, invNet, grand, paid, balance }
  }, [charges, invItems, vcPayAmount])

  const tpAllocTotal = useMemo(function() {
    return tpAllocations.reduce(function(s, a) { return s + (Number(a.amount) || 0) }, 0)
  }, [tpAllocations])

  // Determine if treatment-payment section should be shown.
  // Always show for TREATED + CONSENTED. Optional for ADVISED.
  const showTreatmentSection = outcome === 'TREATED' || outcome === 'CONSENTED' || (activeTreatments && activeTreatments.length > 0)

  async function handleSave() {
    setError(null)
    if (!outcome) { setError('Pick a visit outcome before saving'); return }
    // Validate treatment payment allocations
    if (tpAmount > 0 && !tpUnallocated) {
      if (tpAllocTotal > tpAmount + 0.01) {
        setError('Allocations exceed treatment payment amount (₹' + tpAllocTotal + ' allocated, ₹' + tpAmount + ' received)')
        return
      }
      if (tpAllocTotal < tpAmount - 0.01) {
        setError('Only ₹' + Math.round(tpAllocTotal) + ' of ₹' + Math.round(tpAmount) + ' is allocated. Allocate the full amount across treatments, or check "Don\'t allocate now" to park it.')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        outcome,
        advice: advice.trim(),
        visitCharges: {
          lines: charges.map(function(c) {
            return { label: c.label, category: c.category || 'OTHER', amount: c.amount, discount: c.discount || 0 }
          }),
          inventoryItems: invItems.map(function(i) {
            return { inventoryItemId: i.inventoryItemId, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount || 0 }
          }),
          // Push #7: totalDiscount removed. Round-off is handled as a charges line.
          payment: vcTotals.paid > 0 ? { amount: vcTotals.paid, mode: vcPayMode } : null,
        },
        treatmentPayment: tpAmount > 0 ? {
          totalAmount: Number(tpAmount),
          mode: tpMode,
          // Push #7: each allocation can carry an optional discount that adds to Treatment.discount
          allocations: tpUnallocated ? [] : tpAllocations.filter(function(a) { return Number(a.amount) > 0 || Number(a.discount) > 0 }),
        } : null,
        treatmentsToComplete: completedTreatmentIds,
        nextAppointment: nextApt,
      }

      const res = await fetch('/api/consultation/visit/' + visit.id + '/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Save failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      router.push('/dashboard/patients/' + visit.patient.id)
    } catch (e) {
      setError('Network error — try again')
      setSaving(false)
    }
  }

  return (
    <div>
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
              <button key={o.value} onClick={function() { setOutcome(o.value) }}
                className={'text-left rounded-lg border px-3 py-3 transition ' + (selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                <div className={'text-sm font-medium ' + (selected ? 'text-indigo-900' : 'text-slate-900')}>{o.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{o.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* === SECTION 1: VISIT CHARGES === */}
      <div className="mt-6">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">1 · Visit charges <span className="font-normal normal-case text-slate-400">— consultation fees, materials &amp; medicines, paid in full today</span></div>
        <ChargesPanel presets={presets} charges={charges} setCharges={setCharges} />
        <InventoryPicker items={invItems} setItems={setInvItems} />

        <div className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Payment received</label>
            <div className="flex gap-2">
              <input type="number" min={0} value={vcPayAmount} onChange={function(e) { setVcPayAmount(Number(e.target.value)) }} placeholder="Amount"
                className="flex-1 h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
              <select value={vcPayMode} onChange={function(e) { setVcPayMode(e.target.value) }}
                className="h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Tip: for round-offs (e.g. ₹823 → ₹800), use the &quot;+ Round off&quot; button in the Charges table and enter a negative amount.</p>
          </div>
        </div>

        <div className="mt-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Visit charges</div>
              <div className="font-medium mt-0.5">{formatINR(vcTotals.chargesNet)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Materials &amp; medicines</div>
              <div className="font-medium mt-0.5">{formatINR(vcTotals.invNet)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Total</div>
              <div className="font-medium text-slate-900 mt-0.5">{formatINR(vcTotals.grand)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">{vcTotals.balance > 0 ? 'Balance due' : (vcTotals.balance < 0 ? 'Advance' : 'Settled')}</div>
              <div className={'font-medium mt-0.5 ' + (vcTotals.balance > 0.5 ? 'text-red-700' : 'text-slate-900')}>{formatINR(Math.abs(vcTotals.balance))}</div>
            </div>
          </div>
        </div>
      </div>

      {/* === SECTION 2: TREATMENT PAYMENT (optional) === */}
      {showTreatmentSection && (
        <div className="mt-6">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">2 · Treatment payment <span className="font-normal normal-case text-slate-400">— toward running treatments, partial OK</span></div>
          <TreatmentPaymentPanel
            activeTreatments={activeTreatments || []}
            amount={tpAmount}
            setAmount={setTpAmount}
            mode={tpMode}
            setMode={setTpMode}
            allocations={tpAllocations}
            setAllocations={setTpAllocations}
            unallocated={tpUnallocated}
            setUnallocated={setTpUnallocated}
          />
        </div>
      )}

      {/* Advice */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Advice (prints on prescription slip)</label>
        <textarea value={advice} onChange={function(e) { setAdvice(e.target.value) }} rows={3}
          placeholder="e.g., Warm saline rinses 3x/day for 5 days. Follow-up in 1 week."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
      </div>

      <NextAppointmentPicker value={nextApt} onChange={setNextApt} />

      {/* Push #4: Mark treatments complete inline at close. Saves a trip
          to the Treatments tab when a treatment finishes in this visit. */}
      {activeTreatments && activeTreatments.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Mark treatment complete</div>
          <p className="text-xs text-slate-500 mb-3">Tick if today&apos;s sitting was the last sitting for a treatment. Saves a trip to the Treatments tab.</p>
          <div className="space-y-1.5">
            {activeTreatments.map(function(t) {
              const checked = completedTreatmentIds.includes(t.id)
              return (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={function() { toggleComplete(t.id) }}
                    className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-400"
                  />
                  <span className="text-slate-700">{t.type}{t.area ? ' ' + t.area : ''}</span>
                  <span className="text-xs text-slate-400 ml-1">({t.status === 'IN_PROGRESS' ? 'In progress' : 'Planned'})</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-500">
          Saving marks the visit closed{vcTotals.grand > 0 ? ', generates invoice' : ''}{tpAmount > 0 ? ', records treatment payment' : ''}{completedTreatmentIds.length > 0 ? ', marks ' + completedTreatmentIds.length + ' treatment' + (completedTreatmentIds.length > 1 ? 's' : '') + ' complete' : ''}{nextApt ? ', books next appointment' : ''}.
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button onClick={handleSave} disabled={saving}
            className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 font-medium">
            {saving ? 'Saving…' : 'Save & close visit'}
          </button>
        </div>
      </div>
    </div>
  )
}
