'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Push #3.5: "Start consultation" button removed from this header.
// Rationale: when transitioning out of a freshly-closed visit, this button
// created a confusing intermediate state where invoice/balance figures could
// briefly look wrong. New consultations now start ONLY from the Consultation
// tab in the sidebar — single entry point, no confusion.
//
// The "Resume" button on the in-progress banner (rendered on the Records page
// itself) still exists for in-flight visits and is unaffected.

export default function PatientHistoryActions({ patientId, isArchived }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function toggleArchive() {
    const action = isArchived ? 'unarchive' : 'archive'
    const confirmMsg = isArchived
      ? 'Unarchive this patient? They will appear in consultation search again.'
      : 'Archive this patient? They will no longer appear in consultation search. You can unarchive them anytime.'
    if (!confirm(confirmMsg)) return

    setBusy(true)
    setMenuOpen(false)
    try {
      const res = await fetch('/api/patients/' + patientId + '/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !isArchived })
      })
      if (!res.ok) {
        alert('Failed to ' + action + ' patient.')
        setBusy(false)
        return
      }
      router.refresh()
      setBusy(false)
    } catch (e) {
      alert('Failed to ' + action + ' patient.')
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={function() { setMenuOpen(function(v) { return !v }) }}
          className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="More actions"
        >
          ⋯
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={function() { setMenuOpen(false) }}
            />
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg border border-slate-200 shadow-lg z-20 py-1">
              <button
                onClick={toggleArchive}
                disabled={busy}
                className="w-full text-left text-sm px-3 py-2 hover:bg-slate-50 text-slate-700"
              >
                {isArchived ? 'Unarchive patient' : 'Archive patient'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
