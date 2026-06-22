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

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
  }

  async function handleSubmit() {
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
        const data = await res.json()
        router.refresh()
        onClose()
        // Push #8: after registering, jump straight to consultation
        // (Dr. Shobhna's expectation: register → start consult, not register → view empty Records page)
        router.push('/dashboard/consultation/' + data.patient.id)
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
    <div className="space-y-4">

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Full name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="Patient's full name"
          value={form.name}
          onChange={function(e) { update('name', e.target.value) }}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Age <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            placeholder="Years"
            value={form.age}
            onChange={function(e) { update('age', e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Gender <span className="text-red-400">*</span>
          </label>
          <select
            value={form.gender}
            onChange={function(e) { update('gender', e.target.value) }}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Mobile number <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          placeholder="+91 XXXXX XXXXX"
          value={form.mobile}
          onChange={function(e) { update('mobile', e.target.value) }}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          ABHA ID
          <span className="ml-1 text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="14-digit ABHA ID"
          value={form.abhaId}
          onChange={function(e) { update('abhaId', e.target.value) }}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
        <p className="text-xs text-gray-400 mt-1">Can be added later — never blocks registration</p>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Registering...' : 'Register patient'}
        </button>
      </div>
    </div>
  )
}