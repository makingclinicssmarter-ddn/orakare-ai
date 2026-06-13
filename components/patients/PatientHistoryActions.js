'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PatientHistoryActions({ patientId, isArchived, hasInProgressVisit, inProgressVisitId }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function startConsultation() {
    setBusy(true)
    try {
      const res = await fetch('/api/consultation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId })
      })
      if (!res.ok) {
        alert('Failed to start consultation. Please try again.')
        setBusy(false)
        return
      }
      const data = await res.json()
      const base = '/dashboard/consultation/' + patientId + '/' + data.visitId
      const routes = {
        start: base + '/start',
        examination: base + '/examination',
        treatment: base + '/treatment',
        consent: base + '/consent',
        sittings: base + '/sittings',
      }
      router.push(routes[data.goTo] || routes.start)
    } catch (e) {
      alert('Failed to start consultation. Please try again.')
      setBusy(false)
    }
  }

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
      {/* Start consultation — disabled if archived or in-progress (in-progress shows Resume in banner) */}
      {!isArchived && !hasInProgressVisit && (
        <button
          onClick={startConsultation}
          disabled={busy}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium"
        >
          {busy ? 'Starting…' : 'Start consultation'}
        </button>
      )}

      {/* Overflow menu — archive/unarchive */}
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
