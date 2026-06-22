'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ConsultantPicker from '@/components/consultants/ConsultantPicker'

// Push #9: attach / change / detach a consultant on an existing treatment.
// Appears as a small "+ Consultant" link if no consultant attached, or
// "Edit" link next to the consultant's name if one is attached.

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

export default function EditConsultantButton({ treatment, estimate }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState(
    treatment.consultantId
      ? { consultantId: treatment.consultantId, splitType: treatment.splitType, splitValue: treatment.splitValue }
      : null
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const hasConsultant = !!treatment.consultantId

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const payload = picked
        ? { consultantId: picked.consultantId, splitType: picked.splitType, splitValue: Number(picked.splitValue) || 0 }
        : { consultantId: null }
      const res = await fetch('/api/treatments/' + treatment.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) {
        setError('Failed: ' + (data.error || res.statusText))
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

  async function handleDetach() {
    if (!confirm('Remove consultant from this treatment? Existing fee entries are kept; future payments will not accrue any share.')) return
    setSaving(true)
    try {
      const res = await fetch('/api/treatments/' + treatment.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultantId: null }),
      })
      if (res.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={function() { setOpen(true) }}
        className="text-xs text-slate-400 hover:text-indigo-700 underline decoration-dotted underline-offset-2"
        title={hasConsultant ? 'Edit consultant assignment' : 'Add a consultant to this treatment'}
      >
        {hasConsultant ? 'edit' : '+ consultant'}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-900">{hasConsultant ? 'Edit consultant' : 'Attach consultant'}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Treatment estimate {formatINR(estimate)} · share accrues as patient pays
              </p>
            </div>

            <div className="p-5 space-y-3">
              <ConsultantPicker value={picked} onChange={setPicked} estimate={estimate} />
              {error && <div className="text-xs text-red-600">{error}</div>}
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-2">
              {hasConsultant && (
                <button onClick={handleDetach} disabled={saving}
                  className="text-xs text-red-600 hover:text-red-800">
                  Remove consultant
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={function() { setOpen(false) }} disabled={saving}
                  className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving || (picked && !picked.consultantId)}
                  className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
