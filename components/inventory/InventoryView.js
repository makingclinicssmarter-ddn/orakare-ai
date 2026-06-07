'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function InventoryView({ items }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', category: '', unit: '', stockQty: '',
    minStock: '', unitCost: '', supplier: '', expiryDate: '', notes: ''
  })

  const today = new Date()
  const soon = new Date()
  soon.setDate(soon.getDate() + 30)

  const totalItems = items.length
  const lowStock = items.filter(function(i) {
    return Number(i.minStock || 0) > 0 && Number(i.stockQty || 0) <= Number(i.minStock || 0)
  })
  const expiringSoon = items.filter(function(i) {
    if (!i.expiryDate) return false
    const exp = new Date(i.expiryDate)
    return exp <= soon && exp >= today
  })
  const expired = items.filter(function(i) {
    if (!i.expiryDate) return false
    return new Date(i.expiryDate) < today
  })
  const totalValue = items.reduce(function(sum, i) {
    return sum + Number(i.stockQty || 0) * Number(i.unitCost || 0)
  }, 0)

  const categories = [...new Set(items.map(function(i) { return i.category }).filter(Boolean))]

  let filtered = items
  if (search) {
    filtered = filtered.filter(function(i) {
      return i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.category || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.supplier || '').toLowerCase().includes(search.toLowerCase())
    })
  }
  if (categoryFilter) {
    filtered = filtered.filter(function(i) { return i.category === categoryFilter })
  }
  if (stockFilter === 'low') {
    filtered = filtered.filter(function(i) {
      return Number(i.minStock || 0) > 0 && Number(i.stockQty || 0) <= Number(i.minStock || 0)
    })
  } else if (stockFilter === 'expiry') {
    filtered = filtered.filter(function(i) {
      if (!i.expiryDate) return false
      return new Date(i.expiryDate) <= soon
    })
  }

  function openAdd() {
    setEditItem(null)
    setForm({ name: '', category: '', unit: '', stockQty: '', minStock: '', unitCost: '', supplier: '', expiryDate: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      name: item.name || '',
      category: item.category || '',
      unit: item.unit || '',
      stockQty: item.stockQty || '',
      minStock: item.minStock || '',
      unitCost: item.unitCost || '',
      supplier: item.supplier || '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      notes: item.notes || '',
    })
    setShowForm(true)
  }

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
  }

  async function handleSave() {
    if (!form.name) { alert('Item name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/inventory', {
        method: editItem ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editItem?.id }),
      })
      if (res.ok) {
        setShowForm(false)
        router.refresh()
      } else {
        alert('Failed to save. Please try again.')
      }
    } catch (e) {
      alert('Network error.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return
    try {
      await fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      router.refresh()
    } catch (e) {
      alert('Delete failed.')
    }
  }

  async function handleAdjustStock(item) {
    const qty = prompt(`Adjust stock for "${item.name}"\nCurrent: ${item.stockQty || 0} ${item.unit || ''}\n\nEnter new quantity:`)
    if (qty === null || qty === '') return
    const n = parseFloat(qty)
    if (isNaN(n) || n < 0) { alert('Enter a valid number'); return }
    try {
      await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, stockQty: n }),
      })
      router.refresh()
    } catch (e) {
      alert('Update failed.')
    }
  }

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total items', value: totalItems, color: 'text-gray-700' },
          { label: 'Low / out of stock', value: lowStock.length, color: lowStock.length > 0 ? 'text-red-600' : 'text-gray-700' },
          { label: 'Expiring ≤ 30 days', value: expiringSoon.length + expired.length, color: expiringSoon.length + expired.length > 0 ? 'text-amber-600' : 'text-gray-700' },
          { label: 'Stock value', value: '₹' + totalValue.toLocaleString('en-IN'), color: 'text-gray-700' },
        ].map(function(stat) {
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={'text-xl font-semibold mt-1 ' + stat.color}>{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Filters and add button */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by name, category or supplier..."
          value={search}
          onChange={function(e) { setSearch(e.target.value) }}
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        />
        <select
          value={categoryFilter}
          onChange={function(e) { setCategoryFilter(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        >
          <option value="">All categories</option>
          {categories.map(function(c) { return <option key={c} value={c}>{c}</option> })}
        </select>
        <select
          value={stockFilter}
          onChange={function(e) { setStockFilter(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
        >
          <option value="">All items</option>
          <option value="low">Low / out of stock</option>
          <option value="expiry">Expiring soon</option>
        </select>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add item
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Item', 'Category', 'Stock', 'Min level', 'Unit cost', 'Supplier', 'Expiry', 'Actions'].map(function(h) {
                    return <th key={h} className="text-left text-xs font-medium text-gray-400 px-4 py-3">{h}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map(function(item) {
                  const stock = Number(item.stockQty || 0)
                  const min = Number(item.minStock || 0)
                  const isLow = min > 0 && stock <= min
                  const isOut = stock === 0
                  const expDate = item.expiryDate ? new Date(item.expiryDate) : null
                  const isExpired = expDate && expDate < today
                  const isExpSoon = expDate && !isExpired && expDate <= soon

                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {item.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Out of stock</span>
                        ) : isLow ? (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Low: {stock} {item.unit || ''}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-700">{stock} {item.unit || ''}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {min > 0 ? min + ' ' + (item.unit || '') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.unitCost ? '₹' + Number(item.unitCost).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.supplier || '—'}</td>
                      <td className="px-4 py-3">
                        {expDate ? (
                          isExpired ? (
                            <span className="text-xs font-semibold text-red-600">Expired</span>
                          ) : isExpSoon ? (
                            <span className="text-xs text-amber-600">
                              {expDate.toLocaleDateString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">{expDate.toLocaleDateString('en-IN')}</span>
                          )
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={function() { handleAdjustStock(item) }}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                          >
                            ± Stock
                          </button>
                          <button
                            onClick={function() { openEdit(item) }}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={function() { handleDelete(item.id) }}
                            className="text-xs px-2 py-1 border border-red-100 rounded-lg text-red-500 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit form slide-in */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={function() { setShowForm(false) }} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">
                  {editItem ? 'Edit item' : 'Add item'}
                </h2>
                <button onClick={function() { setShowForm(false) }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Item name *', field: 'name', type: 'text', placeholder: 'e.g. Latex Gloves (Medium)' },
                  { label: 'Category', field: 'category', type: 'text', placeholder: 'Consumables, Medicines...' },
                  { label: 'Unit', field: 'unit', type: 'text', placeholder: 'box, pcs, vial, ml...' },
                  { label: 'Current stock *', field: 'stockQty', type: 'number', placeholder: '0' },
                  { label: 'Minimum level', field: 'minStock', type: 'number', placeholder: '5' },
                  { label: 'Unit cost (₹)', field: 'unitCost', type: 'number', placeholder: '0' },
                  { label: 'Supplier', field: 'supplier', type: 'text', placeholder: 'Supplier name' },
                  { label: 'Expiry date', field: 'expiryDate', type: 'date', placeholder: '' },
                  { label: 'Notes', field: 'notes', type: 'text', placeholder: 'Batch no, storage...' },
                ].map(function(f) {
                  return (
                    <div key={f.field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        placeholder={f.placeholder}
                        value={form[f.field]}
                        onChange={function(e) { update(f.field, e.target.value) }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )
                })}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editItem ? 'Update item' : 'Add item'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}