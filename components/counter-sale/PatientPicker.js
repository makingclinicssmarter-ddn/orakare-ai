'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Buyer selection for counter sale. Two modes:
 *   1. Existing patient — search by name/mobile/originalID, pick one
 *   2. Walk-in — optional name + optional phone
 *
 * value shape:
 *   { mode: 'patient' | 'walkin', patient?: {id, name, ...}, walkInName?, walkInPhone? }
 */

export default function PatientPicker({ value, onChange }) {
  const [mode, setMode] = useState(value?.mode || 'walkin')
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [walkInName, setWalkInName] = useState(value?.walkInName || '')
  const [walkInPhone, setWalkInPhone] = useState(value?.walkInPhone || '')
  const debounceRef = useRef(null)

  // Propagate changes upward
  useEffect(function() {
    if (mode === 'patient') {
      onChange({ mode: 'patient', patient: value?.patient || null })
    } else {
      onChange({ mode: 'walkin', walkInName, walkInPhone })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, walkInName, walkInPhone])

  // Search patients
  useEffect(function() {
    if (mode !== 'patient' || !q.trim()) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async function() {
      setSearching(true)
      try {
        const res = await fetch('/api/patients?search=' + encodeURIComponent(q))
        if (res.ok) {
          const data = await res.json()
          setResults(data.patients || [])
        }
      } finally {
        setSearching(false)
      }
    }, 250)
    return function() { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q, mode])

  function pickPatient(p) {
    onChange({ mode: 'patient', patient: p })
    setQ(p.name)
    setResults([])
  }

  function clearPatient() {
    onChange({ mode: 'patient', patient: null })
    setQ('')
    setResults([])
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Buyer</label>

      <div className="flex gap-2 mb-4">
        <button
          onClick={function() { setMode('walkin') }}
          className={
            'text-sm px-4 py-2 rounded-lg border transition ' +
            (mode === 'walkin'
              ? 'border-primary-700 bg-primary-50 text-primary-700 font-medium'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50')
          }
        >
          Walk-in
        </button>
        <button
          onClick={function() { setMode('patient') }}
          className={
            'text-sm px-4 py-2 rounded-lg border transition ' +
            (mode === 'patient'
              ? 'border-primary-700 bg-primary-50 text-primary-700 font-medium'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50')
          }
        >
          Existing patient
        </button>
      </div>

      {mode === 'walkin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Name (optional)</label>
            <input
              type="text" value={walkInName}
              onChange={function(e) { setWalkInName(e.target.value) }}
              placeholder="e.g. Ravi Kumar"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Phone (optional)</label>
            <input
              type="tel" value={walkInPhone}
              onChange={function(e) { setWalkInPhone(e.target.value) }}
              placeholder="+91"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
      )}

      {mode === 'patient' && (
        <div>
          {value?.patient ? (
            <div className="flex items-center justify-between bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium text-slate-900">{value.patient.name}</div>
                <div className="text-xs text-slate-500">
                  {value.patient.originalID}{value.patient.mobile ? ' · ' + value.patient.mobile : ''}
                </div>
              </div>
              <button
                onClick={clearPatient}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text" value={q}
                onChange={function(e) { setQ(e.target.value) }}
                placeholder="Search by name, phone, or patient ID..."
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {searching && (
                <div className="absolute right-3 top-2.5 text-xs text-slate-400">Searching…</div>
              )}
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                  {results.map(function(p) {
                    return (
                      <button
                        key={p.id}
                        onClick={function() { pickPatient(p) }}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        <div className="font-medium text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          {p.originalID}{p.mobile ? ' · ' + p.mobile : ''}{p.age ? ' · ' + p.age + 'y' : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
