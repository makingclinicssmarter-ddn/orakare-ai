'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsView({ doctor, clinic }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUrl, setLogoUrl] = useState(clinic?.logoUrl || null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef(null)

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

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError('')
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setLogoUrl(data.logoUrl)
        router.refresh()
      } else {
        setLogoError(data.error || 'Upload failed')
      }
    } catch (e) {
      setLogoError('Network error during upload')
    } finally {
      setLogoUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleLogoRemove() {
    setLogoUploading(true)
    try {
      await fetch('/api/settings/logo', { method: 'DELETE' })
      setLogoUrl(null)
      router.refresh()
    } finally {
      setLogoUploading(false)
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

      {/* ── Clinic logo ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Clinic logo</p>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Preview */}
            <div className="w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl
                ? <img src={logoUrl} alt="Clinic logo" className="w-full h-full object-contain p-1" />
                : <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A2.25 2.25 0 0023.25 18V6A2.25 2.25 0 0021 3.75H3A2.25 2.25 0 00.75 6v12A2.25 2.25 0 003 20.25z" />
                  </svg>
              }
            </div>

            {/* Actions */}
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium mb-1">
                {logoUrl ? 'Logo uploaded' : 'No logo yet'}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                PNG, JPG or SVG · max 300 KB · shown on invoices and PDF documents
              </p>
              <div className="flex gap-2 flex-wrap">
                <label className={
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ' +
                  (logoUploading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100')
                }>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                  />
                  {logoUploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                </label>
                {logoUrl && !logoUploading && (
                  <button
                    onClick={handleLogoRemove}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
              {logoError && <p className="text-xs text-red-500 mt-2">{logoError}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Other fields ───────────────────────────────────────────── */}
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
