'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const IST = 'Asia/Kolkata'
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: IST,
  })
}
function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function ReturnForSittingScreen({ treatment }) {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave(closeAfter) {
    setError(null)
    if (!description.trim()) {
      setError('Please describe what was done in this sitting')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/treatments/' + treatment.id + '/sitting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, description, notes }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Save failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      const data = await res.json()
      if (closeAfter) {
        // Route to Close-visit screen for the just-created visit
        router.push('/dashboard/consultation/' + treatment.patient.id + '/' + data.visitId + '/close')
      } else {
        // Just stay on this page; show success and refresh data
        router.push('/dashboard/treatments/' + treatment.id)
      }
    } catch (e) {
      setError('Network error — try again')
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Treatment header — snapshot */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium text-slate-900">{treatment.type}{treatment.area ? ' ' + treatment.area : ''}</div>
            <div className="text-sm text-slate-500 mt-0.5">{treatment.patient.name} · {treatment.patient.originalID}</div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium border bg-amber-50 text-amber-800 border-amber-200">In progress</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-xs text-slate-500">Estimate</div>
            <div className="text-sm font-medium text-slate-900">{formatINR(treatment.estimate)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5">
            <div className="text-xs text-slate-500">Paid so far</div>
            <div className="text-sm font-medium text-green-700">{formatINR(treatment.paid)}</div>
          </div>
          <div className={'rounded-lg p-2.5 ' + (treatment.balance > 0 ? 'bg-red-50' : 'bg-slate-50')}>
            <div className={'text-xs ' + (treatment.balance > 0 ? 'text-red-700' : 'text-slate-500')}>Balance</div>
            <div className={'text-sm font-medium ' + (treatment.balance > 0 ? 'text-red-700' : 'text-slate-900')}>{formatINR(treatment.balance)}</div>
          </div>
        </div>

        {treatment.recentSittings.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Recent sittings</div>
            <div className="space-y-1.5">
              {treatment.recentSittings.map(function(s, i) {
                return (
                  <div key={s.id} className="text-xs text-slate-600">
                    <span className="text-slate-400">{formatDate(s.date)} · </span>
                    {s.description || '(no description)'}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info box: why we're skipping the consultation steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-700 mt-0.5">ℹ</div>
          <div>
            <div className="text-sm font-medium text-blue-900">Skipping history, examination, plan and consent</div>
            <div className="text-xs text-blue-800 mt-1">
              These were done on the first visit. Record today&apos;s sitting only. If you observed new findings or planned new treatments, start a fresh consultation from the Consultation tab instead.
            </div>
          </div>
        </div>
      </div>

      {/* Sitting form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-base font-medium text-slate-900 mb-4">Today&apos;s sitting</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={function(e) { setDate(e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Work done <span className="text-red-400">*</span></label>
            <textarea
              value={description}
              onChange={function(e) { setDescription(e.target.value) }}
              placeholder="e.g. Obturation completed, post-op X-ray taken, occlusion adjusted."
              rows={3}
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Clinical notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={function(e) { setNotes(e.target.value) }}
              placeholder="anything additional to log..."
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <p className="text-xs text-slate-400 italic">
            Payment is collected at visit close — not per sitting.
          </p>
        </div>

        {error && <div className="text-xs text-red-600 mt-3">{error}</div>}

        <div className="mt-5 flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={function() { handleSave(false) }}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save sitting only'}
          </button>
          <button
            onClick={function() { handleSave(true) }}
            disabled={saving}
            className="text-sm px-5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300"
          >
            {saving ? 'Saving…' : 'Save & close visit →'}
          </button>
        </div>
      </div>
    </div>
  )
}
