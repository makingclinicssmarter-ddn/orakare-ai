'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
]

export default function RecordsView({ patients, search }) {
  const router = useRouter()
  const [searchValue, setSearchValue] = useState(search || '')
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('')
  const [editPatient, setEditPatient] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  function handleSearch(e) {
    setSearchValue(e.target.value)
  }

  function toggleExpand(id) {
    setExpanded(function(prev) { return prev === id ? null : id })
  }

  function openEdit(patient) {
    setEditPatient(patient)
    setEditForm({
      id: patient.id,
      name: patient.name || '',
      age: patient.age || '',
      gender: patient.gender || '',
      mobile: patient.mobile || '',
      address: patient.address || '',
    })
  }

  function closeEdit() {
    setEditPatient(null)
    setEditForm({})
  }

  function updateEdit(field, value) {
    setEditForm(function(prev) { return { ...prev, [field]: value } })
  }

  async function handleSaveEdit() {
    if (!editForm.name) { alert('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/patients/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        closeEdit()
        router.refresh()
      } else {
        alert('Failed to save.')
      }
    } catch (e) {
      alert('Network error.')
    } finally {
      setSaving(false)
    }
  }

  function getPatientBalance(patient) {
    let totalEstimate = 0
    patient.visits.forEach(function(visit) {
      if (visit.treatmentPlan?.treatmentItems) {
        visit.treatmentPlan.treatmentItems.forEach(function(item) {
          totalEstimate += parseFloat(item.estimatedCost || 0)
        })
      }
    })
    return { totalEstimate, balance: totalEstimate }
  }

  function hasActiveVisit(patient) {
    return patient.visits.some(function(v) { return v.status !== 'COMPLETED' })
  }

  const searchFiltered = searchValue
    ? patients.filter(function(p) {
        return p.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          (p.mobile && p.mobile.includes(searchValue))
      })
    : patients

  let filtered = searchFiltered
  if (filter === 'active') {
    filtered = filtered.filter(hasActiveVisit)
  } else if (filter === 'balance') {
    filtered = filtered.filter(function(p) {
      return getPatientBalance(p).balance > 0
    })
  }

  return (
    <div className="space-y-4">

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={searchValue}
          onChange={handleSearch}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
        <select
          value={filter}
          onChange={function(e) { setFilter(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        >
          <option value="">All patients</option>
          <option value="active">Active treatment</option>
          <option value="balance">Balance due</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} patient{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">No patients found</p>
          <p className="text-xs text-gray-400">Try a different search or filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(function(patient, index) {
            const initials = patient.name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0, 2)
            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
            const isOpen = expanded === patient.id
            const { totalEstimate, balance } = getPatientBalance(patient)
            const latestVisit = patient.visits[0]
            const medHistory = latestVisit?.medicalHistory
            const treatmentItems = patient.visits.flatMap(function(v) {
              return v.treatmentPlan?.treatmentItems || []
            })
            const hasBalance = balance > 0

            return (
              <div key={patient.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                <div
                  onClick={function() { toggleExpand(patient.id) }}
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 ' + avatarColor}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                      {hasActiveVisit(patient) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {patient.age}y · {patient.gender} · {patient.mobile}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {totalEstimate > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Balance</p>
                        <p className={'text-sm font-semibold ' + (hasBalance ? 'text-red-600' : 'text-green-600')}>
                          {hasBalance ? '₹' + balance.toLocaleString('en-IN') : 'Cleared'}
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Visits</p>
                      <p className="text-sm font-semibold text-gray-700">{patient.visits.length}</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50">

                    {medHistory && (medHistory.conditions?.length > 0 || medHistory.allergies?.length > 0) && (
                      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">
                        {(medHistory.conditions || []).map(function(c) {
                          return <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{c}</span>
                        })}
                        {(medHistory.allergies || []).map(function(a) {
                          return <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Allergy: {a}</span>
                        })}
                      </div>
                    )}

                    {medHistory?.chiefComplaint && (
                      <div className="px-5 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-400">Chief complaint</p>
                        <p className="text-sm text-gray-700">{medHistory.chiefComplaint}</p>
                      </div>
                    )}

                    {treatmentItems.length > 0 && (
                      <div className="px-5 py-3 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Treatment plan</p>
                        <div className="space-y-1">
                          {treatmentItems.map(function(item, i) {
                            return (
                              <div key={i} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <span className={'text-xs px-2 py-0.5 rounded-full ' +
                                    (item.urgency === 'URGENT' ? 'bg-red-50 text-red-700' :
                                     item.urgency === 'SOON' ? 'bg-amber-50 text-amber-700' :
                                     'bg-gray-100 text-gray-600')}>
                                    {item.urgency}
                                  </span>
                                  <span className="text-sm text-gray-700">{item.procedureName}</span>
                                  {item.toothRef && <span className="text-xs text-gray-400">Tooth {item.toothRef}</span>}
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                  ₹{parseFloat(item.estimatedCost || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {patient.visits.length > 0 && (
                      <div className="px-5 py-3 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Visit history</p>
                        <div className="space-y-1">
                          {patient.visits.map(function(visit) {
                            return (
                              <div key={visit.id} className="flex items-center justify-between py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">{new Date(visit.createdAt).toLocaleDateString('en-IN')}</span>
                                  <span className={'text-xs px-2 py-0.5 rounded-full ' +
                                    (visit.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-indigo-50 text-indigo-700')}>
                                    {visit.status.replace(/_/g, ' ').toLowerCase()}
                                  </span>
                                </div>
                                <Link href={'/dashboard/patients/' + patient.id} className="text-xs text-indigo-600 hover:underline" onClick={function(e) { e.stopPropagation() }}>
                                  Open visit
                                </Link>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="px-5 py-3 flex gap-2">
                      <Link
                        href={'/dashboard/patients/' + patient.id}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                        onClick={function(e) { e.stopPropagation() }}
                      >
                        Open patient
                      </Link>
                      <button
                        onClick={function(e) { e.stopPropagation(); openEdit(patient) }}
                        className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                      >
                        Edit details
                      </button>
                      <Link
                        href={'/dashboard/appointments?patient=' + patient.id}
                        className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                        onClick={function(e) { e.stopPropagation() }}
                      >
                        Book appointment
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit patient slide-in */}
      {editPatient && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={closeEdit} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">Edit patient</h2>
                <button onClick={closeEdit} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Full name *', field: 'name', type: 'text', placeholder: 'Patient name' },
                  { label: 'Age', field: 'age', type: 'number', placeholder: '32' },
                  { label: 'Mobile', field: 'mobile', type: 'tel', placeholder: '10-digit number' },
                  { label: 'Address', field: 'address', type: 'text', placeholder: 'Address' },
                ].map(function(f) {
                  return (
                    <div key={f.field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={editForm[f.field] || ''}
                        onChange={function(e) { updateEdit(f.field, e.target.value) }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )
                })}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Gender</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={function(e) { updateEdit('gender', e.target.value) }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}