'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Other']

function TreatmentCard({ treatment, patientId, visitId, onSittingAdded }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
    paid: '',
    payMode: 'Cash',
  })

  const totalPaid = treatment.sittings.reduce(function(s, sitting) {
    return s + (sitting.paid || 0)
  }, 0)
  const balance = (treatment.estimate || 0) - totalPaid
  const sittingCount = treatment.sittings.length

  async function handleSave() {
    if (!form.description.trim()) {
      alert('Please describe the work done')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/consultation/sitting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatmentId: treatment.id,
          patientId,
          visitId,
          date: form.date,
          description: form.description,
          notes: form.notes,
          paid: parseFloat(form.paid) || 0,
          payMode: form.payMode,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOpen(false)
        setForm({
          date: new Date().toISOString().slice(0, 10),
          description: '',
          notes: '',
          paid: '',
          payMode: 'Cash',
        })
        onSittingAdded(treatment.id, data.sitting)
      } else {
        alert('Failed to save sitting. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Treatment header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-900">{treatment.type}</span>
            {treatment.area && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Tooth {treatment.area}
              </span>
            )}
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (
              treatment.status === 'COMPLETED'
                ? 'bg-green-50 text-green-700'
                : treatment.status === 'IN_PROGRESS'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-amber-50 text-amber-700'
            )}>
              {treatment.status === 'COMPLETED' ? 'Completed' :
               treatment.status === 'IN_PROGRESS' ? 'In progress' : 'Planned'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Est. ₹{(treatment.estimate || 0).toLocaleString('en-IN')}</span>
            <span>·</span>
            <span>Paid ₹{totalPaid.toLocaleString('en-IN')}</span>
            <span>·</span>
            <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
              {balance > 0 ? 'Due ₹' + balance.toLocaleString('en-IN') : 'Fully paid'}
            </span>
            <span>·</span>
            <span>{sittingCount} sitting{sittingCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <button
          onClick={function() { setOpen(function(p) { return !p }) }}
          disabled={treatment.status === 'COMPLETED'}
          className="ml-4 bg-primary-700 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add sitting
        </button>
      </div>

      {/* Past sittings */}
      {treatment.sittings.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-2">
          {treatment.sittings.map(function(sitting, i) {
            return (
              <div key={sitting.id} className="flex items-start justify-between text-xs">
                <div>
                  <span className="text-slate-400 mr-2">
                    {new Date(sitting.date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                  <span className="text-slate-700">{sitting.description || sitting.notes || 'Sitting ' + (i + 1)}</span>
                </div>
                {sitting.paid > 0 && (
                  <span className="text-green-700 font-medium ml-4 flex-shrink-0">
                    ₹{sitting.paid.toLocaleString('en-IN')} {sitting.payMode && '· ' + sitting.payMode}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add sitting form */}
      {open && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            New sitting
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Date</div>
              <input
                type="date"
                value={form.date}
                onChange={function(e) {
                  setForm(function(p) { return { ...p, date: e.target.value } })
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Payment collected (₹)</div>
              <input
                type="number"
                placeholder="0"
                value={form.paid}
                onChange={function(e) {
                  setForm(function(p) { return { ...p, paid: e.target.value } })
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
              />
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1">Work done <span className="text-red-400">*</span></div>
            <textarea
              value={form.description}
              onChange={function(e) {
                setForm(function(p) { return { ...p, description: e.target.value } })
              }}
              placeholder="Describe the procedure performed in this sitting..."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Payment mode</div>
              <select
                value={form.payMode}
                onChange={function(e) {
                  setForm(function(p) { return { ...p, payMode: e.target.value } })
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
              >
                {PAYMENT_MODES.map(function(m) {
                  return <option key={m} value={m}>{m}</option>
                })}
              </select>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Clinical notes</div>
              <input
                type="text"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={function(e) {
                  setForm(function(p) { return { ...p, notes: e.target.value } })
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={function() { setOpen(false) }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save sitting'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function WalletPanel({ patient, totalEstimate, totalReceipts, walletBalance, onPaymentAdded }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    paymentMode: 'Cash',
    notes: '',
  })

  const totalDue = totalEstimate - totalReceipts

  async function handleCollect() {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/consultation/collect-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          amount: parseFloat(form.amount),
          paymentMode: form.paymentMode,
          notes: form.notes,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ amount: '', paymentMode: 'Cash', notes: '' })
        onPaymentAdded(parseFloat(form.amount))
      } else {
        alert('Failed to record payment. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-medium text-slate-700 mb-4">Patient wallet</h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Total estimate</div>
          <div className="text-base font-medium text-slate-900">
            ₹{totalEstimate.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Total collected</div>
          <div className="text-base font-medium text-green-700">
            ₹{totalReceipts.toLocaleString('en-IN')}
          </div>
        </div>
        <div className={totalDue > 0 ? 'bg-red-50 rounded-lg p-3' : 'bg-green-50 rounded-lg p-3'}>
          <div className="text-xs text-slate-400 mb-1">Balance due</div>
          <div className={'text-base font-medium ' + (totalDue > 0 ? 'text-red-700' : 'text-green-700')}>
            ₹{Math.max(0, totalDue).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {walletBalance > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs font-medium text-amber-800">
            Unallocated wallet balance: ₹{walletBalance.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            This amount has been collected but not yet allocated to any treatment
          </p>
        </div>
      )}

      {!showForm ? (
        <button
          onClick={function() { setShowForm(true) }}
          className="w-full border border-primary-700 text-primary-700 py-2 rounded-lg text-sm font-medium hover:bg-primary-50 transition"
        >
          + Collect payment
        </button>
      ) : (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Collect payment
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Amount (₹)</div>
              <input
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={function(e) {
                  setForm(function(p) { return { ...p, amount: e.target.value } })
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                autoFocus
              />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Mode</div>
              <select
                value={form.paymentMode}
                onChange={function(e) {
                  setForm(function(p) { return { ...p, paymentMode: e.target.value } })
                }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                {PAYMENT_MODES.map(function(m) {
                  return <option key={m} value={m}>{m}</option>
                })}
              </select>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Notes (optional)</div>
            <input
              type="text"
              placeholder="e.g. advance payment, partial payment..."
              value={form.notes}
              onChange={function(e) {
                setForm(function(p) { return { ...p, notes: e.target.value } })
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={function() { setShowForm(false) }}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCollect}
              disabled={saving}
              className="px-4 py-2 text-sm bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Collect ₹' + (form.amount || '0')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SittingsScreen({
  patient,
  visitId,
  patientId,
  treatments,
  receipts,
  totalEstimate,
  totalReceipts,
  walletBalance,
}) {
  const router = useRouter()
  const [treatmentList, setTreatmentList] = useState(treatments)
  const [totalCollected, setTotalCollected] = useState(totalReceipts)
  const [wallet, setWallet] = useState(walletBalance)

  function handleSittingAdded(treatmentId, newSitting) {
    setTreatmentList(function(prev) {
      return prev.map(function(t) {
        if (t.id !== treatmentId) return t
        return {
          ...t,
          status: 'IN_PROGRESS',
          sittings: [newSitting, ...t.sittings],
        }
      })
    })
    if (newSitting.paid > 0) {
      setTotalCollected(function(p) { return p + newSitting.paid })
    }
  }

  function handlePaymentAdded(amount) {
    setTotalCollected(function(p) { return p + amount })
    setWallet(function(p) { return p + amount })
  }

  const allCompleted = treatmentList.every(function(t) {
    return t.status === 'COMPLETED'
  })

  return (
    <div className="p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-slate-900">Sittings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {treatmentList.length} active treatment{treatmentList.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Wallet */}
      <WalletPanel
        patient={patient}
        totalEstimate={totalEstimate}
        totalReceipts={totalCollected}
        walletBalance={wallet}
        onPaymentAdded={handlePaymentAdded}
      />

      {/* Treatment cards */}
      {treatmentList.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-800">No active treatments found</p>
          <p className="text-xs text-amber-600 mt-1">
            Consent must be signed before sittings can be recorded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {treatmentList.map(function(treatment) {
            return (
              <TreatmentCard
                key={treatment.id}
                treatment={treatment}
                patientId={patientId}
                visitId={visitId}
                onSittingAdded={handleSittingAdded}
              />
            )
          })}
        </div>
      )}

      {/* Complete visit */}
      {allCompleted && treatmentList.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800">All treatments completed</p>
          <p className="text-xs text-green-600 mt-1">You can now generate a visit summary.</p>
        </div>
      )}
    </div>
  )
}