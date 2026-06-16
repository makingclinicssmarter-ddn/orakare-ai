'use client'
import { useState } from 'react'

// Push #4 Wave 2B: AI clinical-notes drafter.
// Sits below a findings textarea. User writes shorthand, clicks "Draft with AI",
// Claude expands. User reviews result and accepts or discards.
//
// Props:
//   shorthand    — current textarea value (what to expand)
//   kind         — 'clinical' | 'radiographical' (controls prompt)
//   onAccept     — called with the drafted text when user clicks "Use this"
//
// The component is dumb about state: parent owns the textarea content.
// We just fetch a draft and surface Use/Discard.

export default function AIDraftPanel({ shorthand, kind, onAccept }) {
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState(null)   // null | string
  const [error, setError] = useState(null)

  async function handleDraft() {
    setError(null)
    if (!shorthand || !shorthand.trim()) {
      setError('Type some shorthand above first, then click Draft.')
      return
    }
    setDrafting(true)
    try {
      const res = await fetch('/api/ai/draft-findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shorthand, kind }),
      })
      const data = await res.json().catch(function() { return {} })
      if (!res.ok) {
        setError(data.error || 'Draft failed. Try again.')
        setDrafting(false)
        return
      }
      setDraft(String(data.drafted || ''))
      setDrafting(false)
    } catch (e) {
      setError('Network error — try again')
      setDrafting(false)
    }
  }

  function handleUse() {
    if (draft && onAccept) onAccept(draft)
    setDraft(null)
  }

  function handleDiscard() {
    setDraft(null)
    setError(null)
  }

  return (
    <div className="mt-2">
      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleDraft}
          disabled={drafting || !shorthand || !shorthand.trim()}
          className="text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title="Expand shorthand into full clinical notes using AI"
        >
          {drafting ? 'Drafting…' : '✨ Draft with AI'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {/* Draft preview panel */}
      {draft !== null && (
        <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="text-xs font-medium text-indigo-800 uppercase tracking-wide">AI draft</div>
            <div className="text-xs text-slate-500">Review before using</div>
          </div>
          <div className="text-sm text-slate-800 whitespace-pre-wrap bg-white border border-indigo-100 rounded-md px-3 py-2">
            {draft}
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleUse}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
            >
              Use this
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            AI is an aid — always review before saving. Your edits stay until you click Save in the chart.
          </p>
        </div>
      )}
    </div>
  )
}
