'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Other']

function TreatmentItemCard({ item, patientId, visitId, onSittingAdded }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    notes: '',
  })

  const sittings = item.sittings || []
  const totalPaid = sittings.reduce(function(s, sitting) {
    return s + (sitting.paid || 0)
  }, 0)
  const balance = (item.estimatedCost || 0) - totalPaid
  const sittingCount = sittings.length
  const isComplete = totalPaid >= (item.estimatedCost || 0) && sittingCount >= (item.estimatedSessions || 1)

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
          treatmentItemId: item.id,
          patientId,
          visitId,
          date: form.date,
          description: form.description,
          notes: form.notes,
          paid: 0,
          payMode: null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setOpen(false)
        setForm({
          date: new Date().toISOString().slice(0, 10),
          description: '',
          notes: '',
        })
        onSittingAdded(item.id, data.sitting)
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
      {/* Item header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-medium text-slate-900">
              {item.procedureName}
            </span>
            {item.toothRef && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Tooth {item.toothRef}
              </span>
            )}
            <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (
              isComplete
                ? 'bg-green-50 text-green-700'
                : sittingCount > 0
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-amber-50 text-amber-700'
            )}>
              {isComplete ? 'Complete' : sittingCount > 0 ? 'In progress' : 'Not started'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span>Est. ₹{(item.estimatedCost || 0).toLocaleString('en-IN')}</span>
            <span>·</span>
            <span>Paid ₹{totalPaid.toLocaleString('en-IN')}</span>
            <span>·</span>
            <span className={balance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
              {balance > 0 ? 'Due ₹' + balance.toLocaleString('en-IN') : 'Fully paid'}
            </span>
            <span>·</span>
            <span>
              {sittingCount} of {item.estimatedSessions || 1} sitting{(item.estimatedSessions || 1) > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={function() { setOpen(function(p) { return !p }) }}
          className={'ml-4 px-4 py-2 rounded-lg text-xs font-medium transition ' + (
            isComplete
              ? 'border border-slate-200 text-slate-500 hover:bg-slate-50'
              : 'bg-primary-700 text-white hover:bg-primary-800'
          )}
        >
          + Add sitting
        </button>
      </div>

      {/* Past sittings */}
      {sittings.length > 0 && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {sittings.map(function(sitting, i) {
            return (
              <div key={sitting.id} className="px-4 py-2.5 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-slate-400">
                      {new Date(sitting.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-500">Sitting {sittings.length - i}</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    {sitting.description || 'No description'}
                  </div>
                  {sitting.notes && (
                    <div className="text-xs text-slate-400 mt-0.5">{sitting.notes}</div>
                  )}
                </div>
                {sitting.paid > 0 && (
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="text-sm font-medium text-green-700">
                      ₹{sitting.paid.toLocaleString('en-IN')}
                    </div>
                    <div className="text-xs text-slate-400">{sitting.payMode}</div>
                  </div>
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
            Record sitting
          </div>
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
            <div className="text-xs text-slate-400 mb-1">
              Work done <span className="text-red-400">*</span>
            </div>
            <textarea
              value={form.description}
              onChange={function(e) {
                setForm(function(p) { return { ...p, description: e.target.value } })
              }}
              placeholder="Describe what was done in this sitting..."
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white resize-none"
              autoFocus
            />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Clinical notes (optional)</div>
            <input
              type="text"
              placeholder="anything additional to log..."
              value={form.notes}
              onChange={function(e) {
                setForm(function(p) { return { ...p, notes: e.target.value } })
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
            />
          </div>
          <p className="text-xs text-slate-400 italic">
            Payment is collected at visit close — not per sitting.
          </p>
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


export default function SittingsScreen({
  patient,
  visitId,
  patientId,
  items,
  receipts,
  totalEstimate,
  totalReceipts,
  walletBalance,
}) {
  const router = useRouter()
  const [itemList, setItemList] = useState(items)

  // Push #3.5 Zip 1.5: per-sitting payment is removed. Payment collection
  // happens at visit close. The parent component still receives
  // receipts/totalReceipts/walletBalance props for backward compatibility
  // with the consultation page; they're no longer used here.

  function handleSittingAdded(itemId, newSitting) {
    setItemList(function(prev) {
      return prev.map(function(item) {
        if (item.id !== itemId) return item
        return {
          ...item,
          sittings: [newSitting, ...(item.sittings || [])],
        }
      })
    })
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-slate-900">Sittings</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {itemList.length} consented treatment{itemList.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Treatment item cards */}
      {itemList.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm font-medium text-amber-800">
            No consented treatments found
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Patient must sign consent before sittings can be recorded.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {itemList.map(function(item) {
            return (
              <TreatmentItemCard
                key={item.id}
                item={item}
                patientId={patientId}
                visitId={visitId}
                onSittingAdded={handleSittingAdded}
              />
            )
          })}
        </div>
      )}

      {/* Push #3: every visit ends at the Close screen. The Close screen
          handles charges, payment, advice, next-appointment, and generates
          the prescription slip. */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-1">Done with sittings for today?</h3>
        <p className="text-xs text-slate-500 mb-4">
          Close the visit to record charges, collect payment, and generate the prescription slip.
        </p>
        <button
          onClick={function() {
            router.push('/dashboard/consultation/' + patientId + '/' + visitId + '/close')
          }}
          className="w-full bg-primary-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition"
        >
          Close visit →
        </button>
      </div>

    </div>
  )
}