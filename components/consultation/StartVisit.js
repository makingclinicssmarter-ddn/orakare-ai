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
  const [conditionInput, setConditionInput] = useState('')
  const [allergyInput, setAllergyInput] = useState('')
  const [medicationInput, setMedicationInput] = useState('')
  const [saving, setSaving] = useState(false)

  function addTag(list, setList, input, setInput) {
    const val = input.trim()
    if (!val) return
    if (!list.includes(val)) setList(function(prev) { return [...prev, val] })
    setInput('')
  }

  function removeTag(list, setList, index) {
    setList(function(prev) { return prev.filter(function(_, i) { return i !== index }) })
  }

  function handleKeyDown(e, list, setList, input, setInput) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(list, setList, input, setInput)
    }
  }

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

      {/* Left panel — patient context */}
      <div className="w-72 min-w-72 border-r border-slate-200 bg-white flex flex-col">
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Medical history snapshot */}
          {visit?.medicalHistory && (
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Medical history
              </div>
              {Array.isArray(visit.medicalHistory.conditions) && visit.medicalHistory.conditions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {visit.medicalHistory.conditions.map(function(c, i) {
                    return (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c}
                      </span>
                    )
                  })}
                </div>
              )}
              {Array.isArray(visit.medicalHistory.allergies) && visit.medicalHistory.allergies.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Allergies</div>
                  <div className="flex flex-wrap gap-1">
                    {visit.medicalHistory.allergies.map(function(a, i) {
                      return (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                          {a}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dental history */}
          {patient.dentalHistory && (
            <div>
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
            <div>
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
            <div>
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
      </div>

      {/* Right panel — consultation form */}
      <div className="flex-1 overflow-y-auto">

        {/* Step bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2">
          {[
            { n: 1, label: 'History', active: true, done: false },
            { n: 2, label: 'Examination', active: false, done: false },
            { n: 3, label: 'Treatment plan', active: false, done: false },
            { n: 4, label: 'Consent', active: false, done: false },
            { n: 5, label: 'Sittings', active: false, done: false },
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

        <div className="p-6 max-w-2xl">
          <h2 className="text-base font-medium text-slate-900 mb-1">Visit history</h2>
          <p className="text-sm text-slate-500 mb-6">Record the patient&apos;s current complaint and medical status</p>

          {/* Visit reason */}
          <div className="mb-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
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
          <div className="mb-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Chief complaint <span className="text-red-400">*</span>
            </div>
            <textarea
              value={chiefComplaint}
              onChange={function(e) { setChiefComplaint(e.target.value) }}
              placeholder="In patient's own words — pain in lower right jaw for 5 days, worse at night..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
            />
          </div>

          {/* Medical conditions */}
          <div className="mb-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Medical conditions
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {conditions.map(function(c, i) {
                return (
                  <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {c}
                    <button onClick={function() { removeTag(conditions, setConditions, i) }} className="text-slate-400 hover:text-red-500 ml-0.5">×</button>
                  </span>
                )
              })}
            </div>
            <input
              type="text"
              value={conditionInput}
              onChange={function(e) { setConditionInput(e.target.value) }}
              onKeyDown={function(e) { handleKeyDown(e, conditions, setConditions, conditionInput, setConditionInput) }}
              onBlur={function() { addTag(conditions, setConditions, conditionInput, setConditionInput) }}
              placeholder="Type condition and press Enter — diabetes, hypertension..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {/* Allergies */}
          <div className="mb-5">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Allergies
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allergies.map(function(a, i) {
                return (
                  <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                    {a}
                    <button onClick={function() { removeTag(allergies, setAllergies, i) }} className="text-red-300 hover:text-red-600 ml-0.5">×</button>
                  </span>
                )
              })}
            </div>
            <input
              type="text"
              value={allergyInput}
              onChange={function(e) { setAllergyInput(e.target.value) }}
              onKeyDown={function(e) { handleKeyDown(e, allergies, setAllergies, allergyInput, setAllergyInput) }}
              onBlur={function() { addTag(allergies, setAllergies, allergyInput, setAllergyInput) }}
              placeholder="Type allergy and press Enter — penicillin, latex..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {/* Medications */}
          <div className="mb-8">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Current medications
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {medications.map(function(m, i) {
                return (
                  <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                    {m}
                    <button onClick={function() { removeTag(medications, setMedications, i) }} className="text-amber-300 hover:text-amber-600 ml-0.5">×</button>
                  </span>
                )
              })}
            </div>
            <input
              type="text"
              value={medicationInput}
              onChange={function(e) { setMedicationInput(e.target.value) }}
              onKeyDown={function(e) { handleKeyDown(e, medications, setMedications, medicationInput, setMedicationInput) }}
              onBlur={function() { addTag(medications, setMedications, medicationInput, setMedicationInput) }}
              placeholder="Type medication and press Enter — metformin, aspirin..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {/* Action */}
          <div className="flex items-center justify-between">
            <button
              onClick={function() { window.history.back() }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !chiefComplaint.trim()}
              className="bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save & proceed to examination →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}