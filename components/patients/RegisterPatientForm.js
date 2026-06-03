'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPatientForm({ onClose }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    mobile: '',
    abhaId: '',
  })

  const handleSubmit = async () => {
    if (!form.name || !form.age || !form.gender || !form.mobile) {
      alert('Please fill in name, age, gender and mobile')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        router.refresh()
        onClose()
      } else {
        alert('Something went wrong. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative bg-white rounded-xl border border-gray-200 p-5 z-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-900">Register new patient</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Full name *</label>
          <input
            type="text"
            placeholder="Patient's full name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Age *</label>
            <input
              type="number"
              placeholder="Age"
              value={form.age}
              onChange={e => setForm({ ...form, age: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Gender *</label>
            <select
              value={form.gender}
              onChange={e => setForm({ ...form, gender: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mobile number *</label>
          <input
            type="tel"
            placeholder="+91"
            value={form.mobile}
            onChange={e => setForm({ ...form, mobile: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">ABHA ID <span className="text-gray-400">(optional)</span></label>
          <input
            type="text"
            placeholder="14-digit ABHA ID"
            value={form.abhaId}
            onChange={e => setForm({ ...form, abhaId: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 mt-2"
        >
          {loading ? 'Registering...' : 'Register patient'}
        </button>
      </div>
    </div>
  )
}