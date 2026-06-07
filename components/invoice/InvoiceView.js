'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_COLORS = {
  PAID: 'bg-green-50 text-green-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  UNPAID: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function InvoiceView({ invoices, patients, clinic, doctorName }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [showPatientDrop, setShowPatientDrop] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }])
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    discount: 0,
    paid: '',
    paymentMode: 'Cash',
    notes: '',
  })

  const totalUnpaid = invoices
    .filter(function(i) { return i.status !== 'PAID' && i.status !== 'CANCELLED' })
    .reduce(function(sum, i) { return sum + Number(i.balance || 0) }, 0)

  const totalRevenue = invoices.reduce(function(sum, i) { return sum + Number(i.paid || 0) }, 0)

  let filtered = invoices
  if (search) {
    filtered = filtered.filter(function(i) {
      return (i.invoiceNo || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.patient?.name || '').toLowerCase().includes(search.toLowerCase())
    })
  }
  if (statusFilter) {
    filtered = filtered.filter(function(i) { return i.status === statusFilter })
  }

  const filteredPatients = patientSearch
    ? patients.filter(function(p) {
        return p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          p.mobile.includes(patientSearch)
      }).slice(0, 6)
    : []

  function addItem() {
    setItems(function(prev) { return [...prev, { description: '', quantity: 1, unitPrice: '' }] })
  }

  function removeItem(index) {
    setItems(function(prev) { return prev.filter(function(_, i) { return i !== index }) })
  }

  function updateItem(index, field, value) {
    setItems(function(prev) {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const subtotal = items.reduce(function(sum, item) {
    return sum + (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0))
  }, 0)
  const discount = parseFloat(form.discount || 0)
  const total = Math.max(0, subtotal - discount)
  const paid = parseFloat(form.paid || 0)
  const balance = Math.max(0, total - paid)

  async function handleSave() {
    if (!selectedPatient) { alert('Please select a patient'); return }
    if (items.some(function(i) { return !i.description || !i.unitPrice })) {
      alert('Please fill all item details')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          date: form.date,
          items: items.map(function(item) {
            return {
              description: item.description,
              quantity: parseFloat(item.quantity || 1),
              unitPrice: parseFloat(item.unitPrice || 0),
              total: parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0),
            }
          }),
          subtotal,
          discount,
          total,
          paid,
          balance,
          paymentMode: form.paymentMode,
          notes: form.notes,
          status: balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setSelectedPatient(null)
        setPatientSearch('')
        setItems([{ description: '', quantity: 1, unitPrice: '' }])
        setForm({ date: new Date().toISOString().split('T')[0], discount: 0, paid: '', paymentMode: 'Cash', notes: '' })
        router.refresh()
      } else {
        alert('Failed to save invoice.')
      }
    } catch (e) {
      alert('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Total invoices</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Total collected</p>
          <p className="text-xl font-semibold text-teal-700 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Balance pending</p>
          <p className={'text-xl font-semibold mt-1 ' + (totalUnpaid > 0 ? 'text-red-600' : 'text-gray-900')}>
            ₹{totalUnpaid.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by invoice no or patient..."
          value={search}
          onChange={function(e) { setSearch(e.target.value) }}
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
        <select
          value={statusFilter}
          onChange={function(e) { setStatusFilter(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white shadow-sm"
        >
          <option value="">All statuses</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </select>
        <button
          onClick={function() { setShowForm(true) }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New invoice
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Invoice no', 'Patient', 'Date', 'Total', 'Paid', 'Balance', 'Status', ''].map(function(h) {
                    return <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map(function(invoice) {
                  return (
                    <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{invoice.invoiceNo}</td>
                      <td className="px-4 py-3 text-gray-700">{invoice.patient?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(invoice.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-gray-700">₹{Number(invoice.total || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-teal-700 font-medium">₹{Number(invoice.paid || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={Number(invoice.balance || 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                          ₹{Number(invoice.balance || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_COLORS[invoice.status] || STATUS_COLORS.UNPAID)}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={function() { window.open('/api/invoice-print/' + invoice.id, '_blank') }}
                          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                        >
                          Print
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={function() { setShowForm(false) }} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">New invoice</h2>
                <button onClick={function() { setShowForm(false) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Patient *</label>
                  {!selectedPatient ? (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search patient..."
                        value={patientSearch}
                        onChange={function(e) { setPatientSearch(e.target.value); setShowPatientDrop(true) }}
                        onFocus={function() { setShowPatientDrop(true) }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {showPatientDrop && filteredPatients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {filteredPatients.map(function(p) {
                            return (
                              <div
                                key={p.id}
                                onClick={function() { setSelectedPatient(p); setPatientSearch(p.name); setShowPatientDrop(false) }}
                                className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                              >
                                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.mobile}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedPatient.name}</p>
                        <p className="text-xs text-gray-500">{selectedPatient.mobile}</p>
                      </div>
                      <button
                        onClick={function() { setSelectedPatient(null); setPatientSearch('') }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={function(e) { setForm(function(p) { return { ...p, date: e.target.value } }) }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Items *</label>
                  <div className="space-y-2">
                    {items.map(function(item, index) {
                      return (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={function(e) { updateItem(index, 'description', e.target.value) }}
                            className="col-span-6 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={function(e) { updateItem(index, 'quantity', e.target.value) }}
                            className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="number"
                            placeholder="Rate"
                            value={item.unitPrice}
                            onChange={function(e) { updateItem(index, 'unitPrice', e.target.value) }}
                            className="col-span-3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={function() { removeItem(index) }}
                            className="col-span-1 text-gray-300 hover:text-red-500 text-lg"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={addItem} className="mt-2 text-xs text-indigo-600 hover:underline">
                    + Add item
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Discount (₹)</span>
                    <input
                      type="number"
                      min="0"
                      value={form.discount}
                      onChange={function(e) { setForm(function(p) { return { ...p, discount: e.target.value } }) }}
                      className="w-24 border border-gray-200 rounded-lg px-3 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.paid}
                      onChange={function(e) { setForm(function(p) { return { ...p, paid: e.target.value } }) }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment mode</label>
                    <select
                      value={form.paymentMode}
                      onChange={function(e) { setForm(function(p) { return { ...p, paymentMode: e.target.value } }) }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white"
                    >
                      {['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque'].map(function(m) {
                        return <option key={m} value={m}>{m}</option>
                      })}
                    </select>
                  </div>
                </div>

                {total > 0 && (
                  <div className={'rounded-xl p-3 flex justify-between items-center ' + (balance > 0 ? 'bg-amber-50' : 'bg-green-50')}>
                    <span className={'text-sm font-medium ' + (balance > 0 ? 'text-amber-700' : 'text-green-700')}>
                      {balance > 0 ? 'Balance due' : 'Fully paid'}
                    </span>
                    <span className={'text-sm font-semibold ' + (balance > 0 ? 'text-amber-700' : 'text-green-700')}>
                      ₹{balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                  <input
                    type="text"
                    placeholder="Next sitting in 1 week..."
                    value={form.notes}
                    onChange={function(e) { setForm(function(p) { return { ...p, notes: e.target.value } }) }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save invoice'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}