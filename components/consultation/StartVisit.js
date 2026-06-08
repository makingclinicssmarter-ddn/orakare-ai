'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const VISIT_REASONS = [
  { id: 'pain', label: 'Pain / Discomfort' },
  { id: 'checkup', label: 'Routine checkup' },
  { id: 'followup', label: 'Follow-up' },
  { id: 'procedure', label: 'Scheduled procedure' },
  { id: 'other', label: 'Other' },
]

function TagInput({ label, tags, setTags, placeholder, color }) {
  const [input, setInput] = useState('')

  function add() {
    const val = input.trim()
    if (!val || tags.includes(val)) return
    setTags(function(prev) { return [...prev, val] })
    setInput('')
  }

  function remove(index) {
    setTags(function(prev) { return prev.filter(function(_, i) { return i !== index }) })
  }

  const colors = {
    slate: { tag: 'bg-slate-100 text-slate-700', btn: 'text-slate-400 hover:text-red-500' },
    red: { tag: 'bg-red-50 text-red-700', btn: 'text-red-300 hover:text-red-600' },
    amber: { tag: 'bg-amber-50 text-amber-700', btn: 'text-amber-300 hover:text-amber-600' },
  }
  const c = colors[color] || colors.slate

  return (
    <div className="mb-4">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{label}</div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {tags.map(function(tag, i) {
            return (
              <span key={i} className={'flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ' + c.tag}>
                {tag}
                <button onClick={function() { remove(i) }} className={c.btn}>×</button>
              </span>
            )
          })}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={function(e) { setInput(e.target.value) }}
        onKeyDown={function(e) {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-600"
      />
    </div>
  )
}

export default function StartVisit({ patient, visit, visitId }) {
  const router = useRouter()
  const [chiefComplaint, setChiefComplaint] = useState(
    visit?.medicalHistory?.chiefComplaint || ''
  )
  const [reason, setReason] = useState('')
  const [conditions, setConditions] = useState(
    visit?.medicalHistory?.conditions || []
  )
  const [allergies, setAllergies] = useState(
    visit?.medicalHistory?.allergies || []
  )
  const [medications, setMedications] = useState(
    visit?.medicalHistory?.medications || []
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!chiefComplaint.trim()) {
      alert('Please enter the chief complaint')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          chiefComplaint,
          conditions,
          allergies,
          medications,
        }),
      })
      if (res.ok) {
        router.push('/dashboard/consultation/' + patient.id + '/' + visitId + '/examination')
      } else {
        alert('Failed to save. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const pastVisits = patient.visits || []

  return (
    <div className="flex h-full">

      {/* Left panel — patient context + editable history */}
      <div className="w-80 min-w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">

        {/* Patient identity */}
        <div className="p-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 font-medium text-lg mb-3">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-base font-medium text-slate-900">{patient.name}</div>
          <div className="text-sm text-slate-500 mt-0.5">
            {patient.age}y · {patient.gender} · {patient.mobile}
          </div>
          {patient.originalID && (
            <div className="text-xs text-slate-400 mt-0.5">{patient.originalID}</div>
          )}
        </div>

        {/* Editable history */}
        <div className="p-5 border-b border-slate-100">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
            Medical history
            <span className="ml-1 font-normal text-slate-400 normal-case">(update if changed)</span>
          </div>

          <TagInput
            label="Conditions"
            tags={conditions}
            setTags={setConditions}
            placeholder="diabetes, hypertension... then Enter"
            color="slate"
          />
          <TagInput
            label="Allergies"
            tags={allergies}
            setTags={setAllergies}
            placeholder="penicillin, latex... then Enter"
            color="red"
          />
          <TagInput
            label="Current medications"
            tags={medications}
            setTags={setMedications}
            placeholder="metformin, aspirin... then Enter"
            color="amber"
          />
        </div>

        {/* Dental history */}
        {patient.dentalHistory && (
          <div className="p-5 border-b border-slate-100">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Dental history
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              {typeof patient.dentalHistory === 'string'
                ? patient.dentalHistory
                : JSON.stringify(patient.dentalHistory)}
            </div>
          </div>
        )}

        {/* Personal history */}
        {patient.personalHistory && (
          <div className="p-5 border-b border-slate-100">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Personal history
            </div>
            <div className="text-xs text-slate-600 leading-relaxed">
              {typeof patient.personalHistory === 'string'
                ? patient.personalHistory
                : JSON.stringify(patient.personalHistory)}
            </div>
          </div>
        )}

        {/* Past visits */}
        {pastVisits.length > 0 && (
          <div className="p-5">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Past visits
            </div>
            <div className="space-y-2">
              {pastVisits.map(function(v) {
                return (
                  <div key={v.id} className="border border-slate-100 rounded-lg p-2.5">
                    <div className="text-xs text-slate-400 mb-1">
                      {new Date(v.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </div>
                    {v.medicalHistory?.chiefComplaint && (
                      <div className="text-xs text-slate-600 mb-1">
                        {v.medicalHistory.chiefComplaint}
                      </div>
                    )}
                    {v.treatmentPlan?.treatmentItems?.map(function(item, i) {
                      return (
                        <div key={i} className="text-xs text-slate-500">
                          {item.procedureName}{item.toothRef ? ' — Tooth ' + item.toothRef : ''}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right panel — chief complaint only */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Step bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2 flex-shrink-0">
          {[
            { n: 1, label: 'History', active: true },
            { n: 2, label: 'Examination', active: false },
            { n: 3, label: 'Treatment plan', active: false },
            { n: 4, label: 'Consent', active: false },
            { n: 5, label: 'Sittings', active: false },
          ].map(function(step, i) {
            return (
              <div key={step.n} className="flex items-center gap-2">
                <div className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ' + (
                  step.active
                    ? 'bg-primary-700 text-white'
                    : 'text-slate-400'
                )}>
                  <span>{step.n}</span>
                  <span>{step.label}</span>
                </div>
                {i < 4 && (
                  <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        <div className="p-8 max-w-xl">
          <h2 className="text-lg font-medium text-slate-900 mb-1">
            What brings the patient in today?
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Record the reason for this visit before proceeding to examination
          </p>

          {/* Reason for visit */}
          <div className="mb-6">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Reason for visit
            </div>
            <div className="flex flex-wrap gap-2">
              {VISIT_REASONS.map(function(r) {
                return (
                  <button
                    key={r.id}
                    onClick={function() { setReason(r.id) }}
                    className={'text-sm px-4 py-2 rounded-lg border transition ' + (
                      reason === r.id
                        ? 'bg-primary-700 text-white border-primary-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-primary-400'
                    )}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Chief complaint */}
          <div className="mb-8">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Chief complaint <span className="text-red-400 normal-case font-normal">* required</span>
            </div>
            <textarea
              value={chiefComplaint}
              onChange={function(e) { setChiefComplaint(e.target.value) }}
              placeholder="In the patient's own words — pain in lower right jaw for 5 days, worse at night, sensitive to cold..."
              rows={5}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={function() { window.history.back() }}
              className="text-sm text-slate-500 hover:text-slate-700 transition"
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !chiefComplaint.trim()}
              className="bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Proceed to examination →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}