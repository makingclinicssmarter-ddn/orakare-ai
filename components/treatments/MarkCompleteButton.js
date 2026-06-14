'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkCompleteButton({ treatmentId }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/treatments/' + treatmentId + '/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionNote: note }),
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
        className="text-sm px-4 py-2 rounded-lg border border-green-500 text-green-700 hover:bg-green-50 font-medium"
      >
        Mark complete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4 p-5">
            <h3 className="text-base font-medium text-slate-900">Mark treatment as completed</h3>
            <p className="text-sm text-slate-500 mt-1">
              This is a final state. The treatment will move out of the active list. You can leave a closing note (optional).
            </p>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Completion note (optional)</label>
              <textarea
                value={note}
                onChange={function(e) { setNote(e.target.value) }}
                placeholder="e.g. Crown delivered, patient happy with fit, no further follow-up needed."
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={function() { setOpen(false) }}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium disabled:bg-slate-300"
              >
                {saving ? 'Saving…' : 'Mark complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
