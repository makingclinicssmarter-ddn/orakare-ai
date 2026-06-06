'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SERVICES = [
  'Consultation',
  'Cleaning',
  'Filling',
  'Root Canal Treatment',
  'Crown',
  'Extraction',
  'Whitening',
  'Orthodontic consultation',
  'Implant consultation',
  'Follow-up',
  'Other',
]

const SLOTS = [
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00',
]


export default function AppointmentForm({ selectedDate, onClose, onSaved }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    service: 'Consultation',
    date: selectedDate ? selectedDate.split('T')[0] : new Date().toISOString().split('T')[0],
    slot: '10:00',
    notes: '',
  })

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
  }

  async function handleSubmit() {
    if (!form.name || !form.date || !form.slot) {
      alert('Please fill in name, date and time slot')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        router.refresh()
        if (onSaved) onSaved()
        if (onClose) onClose()
      } else {
        alert('Failed to save appointment. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Patient name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={function(e) { update('name', e.target.value) }}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
          <input
            type="tel"
            placeholder="+91"
            value={form.phone}
            onChange={function(e) { update('phone', e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
          <input
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={function(e) { update('email', e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Service</label>
        <select
          value={form.service}
          onChange={function(e) { update('service', e.target.value) }}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          {SERVICES.map(function(s) {
            return <option key={s} value={s}>{s}</option>
          })}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Date <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={function(e) { update('date', e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Time slot <span className="text-red-400">*</span>
          </label>
          <select
            value={form.slot}
            onChange={function(e) { update('slot', e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            {SLOTS.map(function(s) {
              return <option key={s} value={s}>{s}</option>
            })}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
        <textarea
          placeholder="Any special instructions or notes..."
          value={form.notes}
          onChange={function(e) { update('notes', e.target.value) }}
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Book appointment'}
      </button>
    </div>
  )
}