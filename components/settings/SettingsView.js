'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsView({ doctor, clinic }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    clinicName: clinic?.name || '',
    doctorName: doctor?.name || '',
    qualification: clinic?.qualification || '',
    regNo: clinic?.regNo || '',
    address: clinic?.address || '',
    phone: clinic?.phone || '',
    email: clinic?.email || '',
    gstNo: clinic?.gstNo || '',
    googleReviewUrl: clinic?.googleReviewUrl || '',
    invoicePrefix: clinic?.invoicePrefix || 'OKR',
  })

  function update(field, value) {
    setForm(function(prev) { return { ...prev, [field]: value } })
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        alert('Failed to save settings.')
      }
    } catch (e) {
      alert('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { section: 'Clinic details' },
    { label: 'Clinic name', field: 'clinicName', type: 'text', placeholder: 'Orakare Dental Clinic' },
    { label: 'Address', field: 'address', type: 'text', placeholder: 'Raipur Road, Dehradun' },
    { label: 'Phone', field: 'phone', type: 'tel', placeholder: '10-digit number' },
    { label: 'Email', field: 'email', type: 'email', placeholder: 'clinic@example.com' },
    { label: 'GST number', field: 'gstNo', type: 'text', placeholder: 'Optional' },
    { section: 'Doctor details' },
    { label: 'Doctor name', field: 'doctorName', type: 'text', placeholder: 'Dr. Shobhna Bansal' },
    { label: 'Qualification', field: 'qualification', type: 'text', placeholder: 'BDS, MDS...' },
    { label: 'Registration number', field: 'regNo', type: 'text', placeholder: 'Medical registration no.' },
    { section: 'Integrations' },
    { label: 'Google Review URL', field: 'googleReviewUrl', type: 'url', placeholder: 'https://g.page/r/...' },
    { section: 'Invoice settings' },
    { label: 'Invoice prefix', field: 'invoicePrefix', type: 'text', placeholder: 'OKR' },
  ]

  return (
    <div className="space-y-4">
      {fields.map(function(f, i) {
        if (f.section) {
          return (
            <div key={i}>
              {i > 0 && <div className="border-t border-gray-100 mt-4" />}
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-4 mb-3">{f.section}</p>
            </div>
          )
        }
        return (
          <div key={f.field} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.field]}
              onChange={function(e) { update(f.field, e.target.value) }}
              className="w-full text-sm text-gray-900 focus:outline-none bg-transparent"
            />
          </div>
        )
      })}

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={'w-full py-3 rounded-xl text-sm font-medium transition ' +
            (saved
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50')}
        >
          {saved ? 'Settings saved!' : saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}