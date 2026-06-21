'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Push #5: Add a correction note to a sitting. Append-only design.
// Original sitting fields stay immutable. This is the audit-friendly way
// to handle "I noticed an error" or "I forgot to add this detail" cases.

export default function SittingCorrectionButton({ sittingId }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    setError(null)
    if (!note.trim()) { setError('Write a correction note'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/sittings/' + sittingId + '/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(function() { return {} })
        setError('Failed: ' + (detail.error || res.statusText))
        setSaving(false)
        return
      }
      setOpen(false)
      setNote('')
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
        className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
        title="Append a correction note (original sitting stays unchanged)"
      >
        + Note
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-medium text-slate-900">Add correction note</h3>
              <p className="text-xs text-slate-500 mt-1">
                The original sitting record stays unchanged. Your note will be appended below with today&apos;s timestamp.
              </p>
            </div>

            <div className="p-5">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Correction / addendum
              </label>
              <textarea
                value={note}
                onChange={function(e) { setNote(e.target.value) }}
                placeholder="e.g. Correction: actual procedure date was 12 Jun, not 14 Jun. / Addendum: also performed scaling on lower arch."
                rows={4}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                autoFocus
              />
              {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={function() { setOpen(false); setNote(''); setError(null) }} disabled={saving}
                className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !note.trim()}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:bg-slate-300">
                {saving ? 'Saving…' : 'Append note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
