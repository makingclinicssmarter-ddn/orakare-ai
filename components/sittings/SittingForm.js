'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Other']

export default function SittingForm({ patients }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [collectedAmount, setCollectedAmount] = useState(0)
  const [pastSittings, setPastSittings] = useState([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0')

  const [form, setForm] = useState({
    date: today,
    time: currentTime,
    done: '',
    prescription: '',
    notes: '',
    paid: '',
    payMode: 'Cash',
    txStatus: 'ONGOING',
  })

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
  }

  const filtered = search
    ? patients.filter(function(p) {
        return p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.mobile.includes(search)
      }).slice(0, 8)
    : []

  function selectPatient(patient) {
    setSelectedPatient(patient)
    setSelectedItem(null)
    setSearch(patient.name)
    setShowDrop(false)
  }

  function clearPatient() {
    setSelectedPatient(null)
    setSelectedItem(null)
    setSearch('')
    setSaved(false)
  }

  const activeItems = selectedPatient
    ? selectedPatient.visits.flatMap(function(visit) {
        return (visit.treatmentPlan?.treatmentItems || []).filter(function(item) {
          return item.consentStatus === 'SIGNED'
        }).map(function(item) {
          return { ...item, visitId: visit.id }
        })
      })
    : []

  const medHistory = selectedPatient?.visits[0]?.medicalHistory

  function getCollectedForItem(item) {
  return collectedAmount
}

  const estimate = selectedItem ? parseFloat(selectedItem.estimatedCost || 0) : 0
  const collected = getCollectedForItem(selectedItem)
  const todayPaid = parseFloat(form.paid || 0)
  const balance = Math.max(0, estimate - collected - todayPaid)

  async function handleSubmit() {
    if (!selectedPatient) { alert('Please select a patient'); return }
    if (!selectedItem) { alert('Please select a treatment'); return }
    if (!form.done.trim()) { alert('Please enter what was done today'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/sittings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          treatmentItemId: selectedItem.id,
          visitId: selectedItem.visitId,
          date: form.date,
          time: form.time,
          done: form.done,
          prescription: form.prescription,
          notes: form.notes,
          paid: parseFloat(form.paid || 0),
          payMode: form.payMode,
          txStatus: form.txStatus,
        }),
      })

      if (res.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(function() {
          setSelectedPatient(null)
          setSelectedItem(null)
          setSearch('')
          setForm({
            date: today,
            time: currentTime,
            done: '',
            prescription: '',
            notes: '',
            paid: '',
            payMode: 'Cash',
            txStatus: 'ONGOING',
          })
          setSaved(false)
        }, 2000)
      } else {
        alert('Failed to save sitting. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Step 1 — Select patient */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Step 1 — Select patient
        </h2>

        {!selectedPatient ? (
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={function(e) {
                setSearch(e.target.value)
                setShowDrop(true)
              }}
              onFocus={function() { setShowDrop(true) }}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {showDrop && filtered.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {filtered.map(function(patient) {
                  return (
                    <div
                      key={patient.id}
                      onClick={function() { selectPatient(patient) }}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-400">{patient.age}y · {patient.mobile}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedPatient.name}</p>
              <p className="text-xs text-gray-500">{selectedPatient.age}y · {selectedPatient.gender} · {selectedPatient.mobile}</p>
            </div>
            <button
              onClick={clearPatient}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Change
            </button>
          </div>
        )}

        {/* Medical history flags */}
        {selectedPatient && medHistory && (medHistory.conditions?.length > 0 || medHistory.allergies?.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {(medHistory.conditions || []).map(function(c) {
              return (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {c}
                </span>
              )
            })}
            {(medHistory.allergies || []).map(function(a) {
              return (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                  Allergy: {a}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Step 2 — Select treatment */}
      {selectedPatient && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Step 2 — Select treatment
          </h2>

          {activeItems.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">No active treatments with signed consent</p>
              <p className="text-xs text-gray-400 mt-1">Complete the clinical flow first to create a treatment plan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeItems.map(function(item) {
                const isSelected = selectedItem?.id === item.id
                return (
                  <div
                    key={item.id}
                    onClick={function() {
  setSelectedItem(item)
  setCollectedAmount(0)
  setPastSittings([])
  fetch('/api/sittings?treatmentItemId=' + item.id)
    .then(function(r) { return r.json() })
    .then(function(data) {
      setCollectedAmount(data.totalPaid || 0)
      setPastSittings(data.sittings || [])
    })
    .catch(function() {})
}}
                    className={'flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition ' +
                      (isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200')}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.procedureName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.toothRef && 'Tooth ' + item.toothRef + ' · '}
                        {item.estimatedSessions} sitting{item.estimatedSessions > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">
                        ₹{parseFloat(item.estimatedCost || 0).toLocaleString('en-IN')}
                      </p>
                      <span className={'text-xs px-2 py-0.5 rounded-full ' +
                        (item.urgency === 'URGENT' ? 'bg-red-50 text-red-700' :
                         item.urgency === 'SOON' ? 'bg-amber-50 text-amber-700' :
                         'bg-gray-100 text-gray-500')
                      }>
                        {item.urgency}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {/* Past sittings history */}
{selectedItem && pastSittings.length > 0 && (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <h2 className="text-sm font-medium text-gray-700 mb-3">
      Past sittings ({pastSittings.length})
    </h2>
    <div className="space-y-2">
      {pastSittings.map(function(sitting, index) {
        return (
          <div key={sitting.id} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">
                {new Date(sitting.date).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </span>
              {sitting.paid > 0 && (
                <span className="text-xs font-semibold text-green-600">
                  ₹{parseFloat(sitting.paid).toLocaleString('en-IN')} paid
                </span>
              )}
            </div>
            {sitting.description && (
              <p className="text-sm text-gray-700 mt-1">{sitting.description}</p>
            )}
            {sitting.prescription && (
              <p className="text-xs text-gray-500 mt-1 italic">{sitting.prescription}</p>
            )}
            {sitting.notes && (
              <p className="text-xs text-gray-400 mt-1">{sitting.notes}</p>
            )}
          </div>
        )
      })}
    </div>
  </div>
)}
      {/* Step 3 — Record sitting */}
      {selectedItem && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Step 3 — Record today&apos;s sitting
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={function(e) { update('date', e.target.value) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={function(e) { update('time', e.target.value) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Treatment done today <span className="text-red-400">*</span>
              </label>
              <textarea
                placeholder="e.g. Canal cleaned and shaped, temporary filling placed..."
                value={form.done}
                onChange={function(e) { update('done', e.target.value) }}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Prescription / medicines
              </label>
              <textarea
                placeholder="e.g. Tab. Amoxicillin 500mg BD x 5 days, Tab. Ibuprofen 400mg TDS x 3 days..."
                value={form.prescription}
                onChange={function(e) { update('prescription', e.target.value) }}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Notes / next sitting plan
              </label>
              <textarea
                placeholder="e.g. Patient tolerating well. Next: permanent filling in 1 week..."
                value={form.notes}
                onChange={function(e) { update('notes', e.target.value) }}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Payment section */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Payment</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Amount paid today (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={form.paid}
                    onChange={function(e) { update('paid', e.target.value) }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Payment mode
                  </label>
                  <select
                    value={form.payMode}
                    onChange={function(e) { update('payMode', e.target.value) }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PAY_MODES.map(function(m) {
                      return <option key={m} value={m}>{m}</option>
                    })}
                  </select>
                </div>
              </div>

              {/* Billing bar */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Estimate</p>
                  <p className="text-sm font-semibold text-gray-700">₹{estimate.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Collected</p>
                  <p className="text-sm font-semibold text-gray-700">₹{collected.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Today</p>
                  <p className="text-sm font-semibold text-indigo-600">₹{todayPaid.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className={'text-sm font-semibold ' + (balance > 0 ? 'text-red-600' : 'text-green-600')}>
                    {balance > 0 ? '₹' + balance.toLocaleString('en-IN') : 'Cleared'}
                  </p>
                </div>
              </div>
            </div>

            {/* Treatment status */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">After this sitting</p>
              <div className="flex gap-3">
                <button
                  onClick={function() { update('txStatus', 'ONGOING') }}
                  className={'flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition ' +
                    (form.txStatus === 'ONGOING'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300')}
                >
                  Treatment ongoing
                </button>
                <button
                  onClick={function() { update('txStatus', 'COMPLETED') }}
                  className={'flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition ' +
                    (form.txStatus === 'COMPLETED'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300')}
                >
                  Treatment complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      {selectedItem && (
        <button
          onClick={handleSubmit}
          disabled={loading || saved}
          className={'w-full py-3 rounded-xl text-sm font-medium transition ' +
            (saved
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50')}
        >
          {saved ? 'Sitting saved!' : loading ? 'Saving...' : 'Save sitting'}
        </button>
      )}
    </div>
  )
}