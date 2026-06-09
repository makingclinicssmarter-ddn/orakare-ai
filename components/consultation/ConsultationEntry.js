'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsultationEntry({ doctorId, clinicId }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(function() {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return function() { document.removeEventListener('mousedown', handleClickOutside) }
  }, [])

  useEffect(function() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 2) {
      debounceRef.current = setTimeout(function() {
        setResults([])
        setShowDropdown(false)
      }, 0)
      return
    }
    debounceRef.current = setTimeout(async function() {
      setLoading(true)
      try {
        const res = await fetch('/api/consultation/search?q=' + encodeURIComponent(query))
        const data = await res.json()
        setResults(data.patients || [])
        setShowDropdown(true)
      } catch (e) {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  async function handleSelect(patient) {
    setQuery(patient.name)
    setShowDropdown(false)
    setStarting(true)

    try {
      const res = await fetch('/api/consultation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id })
      })
      const data = await res.json()
      console.log('API response:', data)  // ← add this

      const base = '/dashboard/consultation/' + patient.id + '/' + data.visitId
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
      setStarting(false)
    }
  }

  function getVisitStatus(patient) {
    const visit = patient.visits?.[0]
    if (!visit) return null
    const hasConsented = visit.treatmentPlan?.treatmentItems?.some(
      function(i) { return i.consentStatus === 'SIGNED' }
    )
    if (hasConsented) return { label: 'Treatment in progress', color: 'bg-amber-50 text-amber-700' }
    if (visit.status !== 'COMPLETED') return { label: 'Consultation incomplete', color: 'bg-blue-50 text-blue-700' }
    return { label: 'Last visit: ' + new Date(visit.createdAt).toLocaleDateString('en-IN'), color: 'bg-slate-100 text-slate-600' }
  }
  // Warm up DB on page load
useEffect(function() {
  fetch('/api/warmup').catch(function() {})
}, [])

  return (
    <div className="max-w-xl">
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={function(e) { setQuery(e.target.value) }}
            placeholder="Search patient by name, mobile or ID..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white shadow-sm"
            autoFocus
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {results.map(function(patient) {
              const status = getVisitStatus(patient)
              return (
                <button
                  key={patient.id}
                  onClick={function() { handleSelect(patient) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-none"
                >
                  <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-medium text-sm flex-shrink-0">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{patient.name}</span>
                      {patient.originalID && (
                        <span className="text-xs text-slate-400">{patient.originalID}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">{patient.age}y · {patient.gender} · {patient.mobile}</div>
                  </div>
                  {status && (
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ' + status.color}>
                      {status.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {showDropdown && results.length === 0 && !loading && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 text-center">
            <p className="text-sm text-slate-500">No patients found for &ldquo;{query}&rdquo;</p>
            <button
              onClick={function() { router.push('/dashboard/patients?register=true') }}
              className="mt-2 text-sm text-primary-700 hover:underline"
            >
              Register new patient →
            </button>
          </div>
        )}
      </div>

      {starting && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading consultation...
        </div>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Type at least 2 characters to search. Select a patient to begin or resume consultation.
      </p>
    </div>
  )
}