'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  'Staff Salary', 'Vendor Payment', 'Rent', 'Utilities',
  'Lab Charges', 'Equipment', 'Marketing', 'Miscellaneous'
]

const PAY_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card']

export default function ExpensesView({ expenses }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '', category: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    payee: '', paymentMode: 'Cash', notes: '', recurring: false,
  })

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
  }

  let filtered = expenses
  if (search) {
    filtered = filtered.filter(function(e) {
      return (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.payee || '').toLowerCase().includes(search.toLowerCase())
    })
  }
  if (categoryFilter) {
    filtered = filtered.filter(function(e) { return e.category === categoryFilter })
  }

  const totalAmount = filtered.reduce(function(sum, e) {
    return sum + Number(e.amount || 0)
  }, 0)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthTotal = expenses.filter(function(e) {
    return (e.date ? new Date(e.date).toISOString().slice(0, 7) : '') === thisMonth
  }).reduce(function(sum, e) { return sum + Number(e.amount || 0) }, 0)

  const catTotals = {}
  expenses.forEach(function(e) {
    const c = e.category || 'Other'
    catTotals[c] = (catTotals[c] || 0) + Number(e.amount || 0)
  })
  const topCategory = Object.entries(catTotals).sort(function(a, b) { return b[1] - a[1] })[0]

  async function handleSave() {
    if (!form.description || !form.category || !form.amount || !form.date) {
      alert('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({
          description: '', category: '', amount: '',
          date: new Date().toISOString().split('T')[0],
          payee: '', paymentMode: 'Cash', notes: '', recurring: false,
        })
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

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return
    try {
      await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } catch (e) {
      alert('Delete failed.')
    }
  }

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">This month</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            ₹{thisMonthTotal.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Total expenses</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">
            {expenses.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400">Top category</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">
            {topCategory ? topCategory[0] : '—'}
          </p>
          {topCategory && (
            <p className="text-xs text-gray-400">₹{Number(topCategory[1]).toLocaleString('en-IN')}</p>
          )}
        </div>
      </div>

      {/* Filters and add button */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by description or payee..."
          value={search}
          onChange={function(e) { setSearch(e.target.value) }}
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
        <select
          value={categoryFilter}
          onChange={function(e) { setCategoryFilter(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white shadow-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
        </select>
        <button
          onClick={function() { setShowForm(true) }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add expense
        </button>
      </div>

      {/* Expenses table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No expenses found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Date', 'Description', 'Category', 'Payee', 'Mode', 'Amount', ''].map(function(h) {
                      return <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(function(expense) {
                    return (
                      <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(expense.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          {expense.notes && <p className="text-xs text-gray-400">{expense.notes}</p>}
                          {expense.recurring && <span className="text-xs text-indigo-600">↻ Recurring</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {expense.category || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{expense.payee || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{expense.paymentMode || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600">
                          ₹{Number(expense.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={function() { handleDelete(expense.id) }}
                            className="text-xs px-2 py-1 border border-red-100 rounded-lg text-red-500 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-xs text-gray-400">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</p>
              <p className="text-sm font-semibold text-gray-700">
                Total: ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Add expense slide-in */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={function() { setShowForm(false) }} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">Add expense</h2>
                <button onClick={function() { setShowForm(false) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Description *</label>
                  <input type="text" placeholder="e.g. Staff salary, Glove purchase..." value={form.description} onChange={function(e) { update('description', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Category *</label>
                  <select value={form.category} onChange={function(e) { update('category', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Select...</option>
                    {CATEGORIES.map(function(c) { return <option key={c} value={c}>{c}</option> })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹) *</label>
                  <input type="number" placeholder="0" min="0" value={form.amount} onChange={function(e) { update('amount', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={function(e) { update('date', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Payee / Vendor</label>
                  <input type="text" placeholder="Staff name, vendor..." value={form.payee} onChange={function(e) { update('payee', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment mode</label>
                  <select value={form.paymentMode} onChange={function(e) { update('paymentMode', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {PAY_MODES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                  <input type="text" placeholder="Invoice no, reference..." value={form.notes} onChange={function(e) { update('notes', e.target.value) }} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.recurring} onChange={function(e) { update('recurring', e.target.checked) }} className="w-4 h-4" />
                  <span className="text-xs text-gray-600">Recurring monthly expense</span>
                </label>
                <button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save expense'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}