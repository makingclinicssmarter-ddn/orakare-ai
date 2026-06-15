'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Push #4 first wave: edit patient details without creating a new record.
// Renders a small button; opens a modal with editable fields.
//
// Editable: name, mobile, age, gender, address, email
// NOT editable: ORK-ID, createdAt, clinic

export default function EditPatientButton({ patient, size }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: patient.name || '',
    mobile: patient.mobile || '',
    age: patient.age || '',
    gender: patient.gender || '',
    address: patient.address || '',
    email: patient.email || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const buttonClass = size === 'sm'
    ? 'text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition'
    : 'text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50'

  function update(field, value) {
    setForm(function(p) { return { ...p, [field]: value } })
  }

  async function handleSave() {
    setError(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.mobile.trim()) { setError('Mobile is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/patients/' + patient.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          age: form.age ? parseInt(form.age, 10) : null,
          gender: form.gender || null,
          address: form.address.trim() || null,
          email: form.email.trim() || null,
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={function() { setOpen(true) }}
        className={buttonClass}
        title="Edit patient details"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-900">Edit patient details</h3>
              <p className="text-xs text-slate-500 mt-1">
                ID and history stay the same. Change only what was wrongly entered.
              </p>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Name <span className="text-red-400">*</span></label>
                <input
                  type="text" value={form.name}
                  onChange={function(e) { update('name', e.target.value) }}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Mobile <span className="text-red-400">*</span></label>
                  <input
                    type="tel" value={form.mobile}
                    onChange={function(e) { update('mobile', e.target.value) }}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input
                    type="email" value={form.email}
                    onChange={function(e) { update('email', e.target.value) }}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Age</label>
                  <input
                    type="number" min={0} max={150} value={form.age}
                    onChange={function(e) { update('age', e.target.value) }}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Gender</label>
                  <select
                    value={form.gender}
                    onChange={function(e) { update('gender', e.target.value) }}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">—</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
                <textarea
                  value={form.address}
                  onChange={function(e) { update('address', e.target.value) }}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                Patient ID <span className="font-medium text-slate-600">{patient.originalID}</span> stays the same. Treatments, visits, and invoices are unaffected.
              </div>

              {error && <div className="text-xs text-red-600">{error}</div>}
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={function() { setOpen(false) }} disabled={saving}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
