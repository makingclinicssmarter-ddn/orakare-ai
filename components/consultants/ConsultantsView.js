'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsultantsView({ consultants, feeEntries }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editConsultant, setEditConsultant] = useState(null)
  const [saving, setSaving] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    name: '', specialization: '', phone: '', email: '',
    splitType: 'percent', splitValue: '', notes: '', active: true,
  })

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
  }

  function openAdd() {
    setEditConsultant(null)
    setForm({ name: '', specialization: '', phone: '', email: '', splitType: 'percent', splitValue: '', notes: '', active: true })
    setShowForm(true)
  }

  function openEdit(c) {
    setEditConsultant(c)
    setForm({
      name: c.name || '',
      specialization: c.specialization || '',
      phone: c.phone || '',
      email: c.email || '',
      splitType: c.splitType || 'percent',
      splitValue: c.splitValue || '',
      notes: c.notes || '',
      active: c.active !== false,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name) { alert('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/consultants', {
        method: editConsultant ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editConsultant?.id }),
      })
      if (res.ok) { setShowForm(false); router.refresh() }
      else { alert('Failed to save.') }
    } catch (e) { alert('Network error.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this consultant?')) return
    try {
      await fetch('/api/consultants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } catch (e) { alert('Delete failed.') }
  }

  async function markPaid(id) {
    try {
      await fetch('/api/consultants/fee', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Paid', paidDate: new Date().toISOString() }),
      })
      router.refresh()
    } catch (e) { alert('Update failed.') }
  }

  const pendingFees = feeEntries.filter(function(f) { return (f.status || 'Pending') === 'Pending' })
  const totalPending = pendingFees.reduce(function(sum, f) { return sum + Number(f.consultantShare || 0) }, 0)
  const totalPaid = feeEntries.filter(function(f) { return f.status === 'Paid' }).reduce(function(sum, f) { return sum + Number(f.consultantShare || 0) }, 0)

  let filteredFees = feeEntries
  if (ledgerFilter) filteredFees = filteredFees.filter(function(f) { return f.consultantId === ledgerFilter })
  if (statusFilter) filteredFees = filteredFees.filter(function(f) { return (f.status || 'Pending') === statusFilter })

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Active consultants</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            {consultants.filter(function(c) { return c.active !== false }).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Pending fees</p>
          <p className={'text-xl font-semibold mt-1 ' + (totalPending > 0 ? 'text-amber-600' : 'text-gray-900')}>
            ₹{totalPending.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Total paid out</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            ₹{totalPaid.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Consultants list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Consultants</h2>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add consultant
          </button>
        </div>

        {consultants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No consultants added yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {consultants.map(function(c) {
              const cFees = feeEntries.filter(function(f) { return f.consultantId === c.id })
              const cPending = cFees.filter(function(f) { return (f.status || 'Pending') === 'Pending' }).reduce(function(sum, f) { return sum + Number(f.consultantShare || 0) }, 0)

              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-sm font-semibold text-indigo-700 flex-shrink-0">
                    {c.name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {c.active === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.specialization && c.specialization + ' · '}
                      {c.phone && c.phone + ' · '}
                      {c.splitType === 'percent' ? (c.splitValue + '% to consultant') : ('₹' + c.splitValue + ' fixed')}
                    </p>
                  </div>
                  {cPending > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Pending</p>
                      <p className="text-sm font-semibold text-amber-600">₹{cPending.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={function() { openEdit(c) }} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                    <button onClick={function() { handleDelete(c.id) }} className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fee ledger */}
      {feeEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
            <h2 className="text-sm font-medium text-gray-700">Fee ledger</h2>
            <div className="flex gap-2">
              <select
                value={ledgerFilter}
                onChange={function(e) { setLedgerFilter(e.target.value) }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white"
              >
                <option value="">All consultants</option>
                {consultants.map(function(c) { return <option key={c.id} value={c.id}>{c.name}</option> })}
              </select>
              <select
                value={statusFilter}
                onChange={function(e) { setStatusFilter(e.target.value) }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white"
              >
                <option value="">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Consultant', 'Total collected', 'Clinic share', 'Consultant share', 'Status', ''].map(function(h) {
                    return <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredFees.map(function(fee) {
                  return (
                    <tr key={fee.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{fee.consultant?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">₹{Number(fee.totalCollected || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-gray-700">₹{Number(fee.clinicShare || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(fee.consultantShare || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                          ((fee.status || 'Pending') === 'Paid'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-amber-50 text-amber-700')
                        }>
                          {fee.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(fee.status || 'Pending') === 'Pending' && (
                          <button
                            onClick={function() { markPaid(fee.id) }}
                            className="text-xs px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100"
                          >
                            Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit form slide-in */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={function() { setShowForm(false) }} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">{editConsultant ? 'Edit consultant' : 'Add consultant'}</h2>
                <button onClick={function() { setShowForm(false) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Full name *', field: 'name', type: 'text', placeholder: 'Dr. Pankaj Mehta' },
                  { label: 'Specialization', field: 'specialization', type: 'text', placeholder: 'Orthodontist, Endodontist...' },
                  { label: 'Mobile', field: 'phone', type: 'tel', placeholder: '10-digit number' },
                  { label: 'Email', field: 'email', type: 'email', placeholder: 'doctor@example.com' },
                  { label: 'Notes', field: 'notes', type: 'text', placeholder: 'Any notes...' },
                ].map(function(f) {
                  return (
                    <div key={f.field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={form[f.field]} onChange={function(e) { update(f.field, e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  )
                })}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Split type</label>
                  <select value={form.splitType} onChange={function(e) { update('splitType', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {form.splitType === 'percent' ? 'Consultant gets (%)' : 'Consultant gets (₹)'}
                  </label>
                  <input type="number" min="0" placeholder="30" value={form.splitValue} onChange={function(e) { update('splitValue', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={function(e) { update('active', e.target.checked) }} className="w-4 h-4" />
                  <span className="text-xs text-gray-600">Active consultant</span>
                </label>
                <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving...' : editConsultant ? 'Update consultant' : 'Add consultant'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}