'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const COMMON_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart disease', 'Asthma',
  'Thyroid disorder', 'Kidney disease', 'Liver disease', 'Epilepsy'
]

const COMMON_ALLERGIES = [
  'Penicillin', 'Aspirin', 'Ibuprofen', 'Latex',
  'Local anaesthetic', 'Sulfa drugs', 'Codeine'
]

export default function MedicalHistoryForm({ patient, visitId, existing }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(!!existing)
  const [form, setForm] = useState({
    chiefComplaint: existing?.chiefComplaint || '',
    conditions: existing?.conditions || [],
    allergies: existing?.allergies || [],
    medications: existing?.medications || [],
    customCondition: '',
    customAllergy: '',
    medicationName: '',
    medicationDose: '',
  })

  function toggleCondition(condition) {
    setForm(function(prev) {
      return {
        ...prev,
        conditions: prev.conditions.includes(condition)
          ? prev.conditions.filter(function(c) { return c !== condition })
          : [...prev.conditions, condition]
      }
    })
    setSaved(false)
  }

  function toggleAllergy(allergy) {
    setForm(function(prev) {
      return {
        ...prev,
        allergies: prev.allergies.includes(allergy)
          ? prev.allergies.filter(function(a) { return a !== allergy })
          : [...prev.allergies, allergy]
      }
    })
    setSaved(false)
  }

  function addCustomCondition() {
    if (!form.customCondition.trim()) return
    setForm(function(prev) {
      return {
        ...prev,
        conditions: [...prev.conditions, prev.customCondition.trim()],
        customCondition: ''
      }
    })
  }

  function addCustomAllergy() {
    if (!form.customAllergy.trim()) return
    setForm(function(prev) {
      return {
        ...prev,
        allergies: [...prev.allergies, prev.customAllergy.trim()],
        customAllergy: ''
      }
    })
  }

  function addMedication() {
    if (!form.medicationName.trim()) return
    setForm(function(prev) {
      return {
        ...prev,
        medications: [...prev.medications, {
          name: prev.medicationName.trim(),
          dose: prev.medicationDose.trim()
        }],
        medicationName: '',
        medicationDose: '',
      }
    })
  }

  function removeMedication(index) {
    setForm(function(prev) {
      return {
        ...prev,
        medications: prev.medications.filter(function(_, i) { return i !== index })
      }
    })
  }

  async function handleSubmit() {
    if (!form.chiefComplaint.trim()) {
      alert('Please enter the chief complaint')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          chiefComplaint: form.chiefComplaint,
          conditions: form.conditions,
          allergies: form.allergies,
          medications: form.medications,
        }),
      })
      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else {
        alert('Something went wrong. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Chief complaint */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-indigo-50 rounded-lg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-800">Chief complaint <span className="text-red-400">*</span></h3>
        </div>
        <textarea
          placeholder="What brings you in today? Describe your main concern..."
          value={form.chiefComplaint}
          onChange={function(e) { setForm(function(p) { return { ...p, chiefComplaint: e.target.value } }); setSaved(false) }}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition text-gray-700 placeholder-gray-300"
        />
      </div>

      {/* Medical conditions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-800">Medical conditions</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-8">Select all that apply</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_CONDITIONS.map(function(condition) {
            const selected = form.conditions.includes(condition)
            return (
              <button
                key={condition}
                onClick={function() { toggleCondition(condition) }}
                className={'text-xs px-3 py-1.5 rounded-full border font-medium transition ' +
                  (selected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  )}
              >
                {condition}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Other condition..."
            value={form.customCondition}
            onChange={function(e) { setForm(function(p) { return { ...p, customCondition: e.target.value } }) }}
            onKeyDown={function(e) { if (e.key === 'Enter') addCustomCondition() }}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <button
            onClick={addCustomCondition}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition font-medium"
          >
            Add
          </button>
        </div>
        {form.conditions.filter(function(c) { return !COMMON_CONDITIONS.includes(c) }).map(function(c) {
          return (
            <span key={c} className="inline-flex items-center gap-1 mt-2 mr-2 text-xs px-3 py-1.5 rounded-full bg-indigo-600 text-white">
              {c}
              <button onClick={function() { toggleCondition(c) }} className="ml-1 hover:opacity-70">x</button>
            </span>
          )
        })}
      </div>

      {/* Allergies */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-800">Known allergies</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-8">Critical for anaesthesia and medication decisions</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_ALLERGIES.map(function(allergy) {
            const selected = form.allergies.includes(allergy)
            return (
              <button
                key={allergy}
                onClick={function() { toggleAllergy(allergy) }}
                className={'text-xs px-3 py-1.5 rounded-full border font-medium transition ' +
                  (selected
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                  )}
              >
                {allergy}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Other allergy..."
            value={form.customAllergy}
            onChange={function(e) { setForm(function(p) { return { ...p, customAllergy: e.target.value } }) }}
            onKeyDown={function(e) { if (e.key === 'Enter') addCustomAllergy() }}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <button
            onClick={addCustomAllergy}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition font-medium"
          >
            Add
          </button>
        </div>
      </div>

      {/* Medications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-800">Current medications</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-8">Blood thinners and diabetes medications affect treatment</p>

        {form.medications.length > 0 && (
          <div className="mb-3 space-y-2">
            {form.medications.map(function(med, index) {
              return (
                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{med.name}</span>
                    {med.dose && <span className="text-xs text-gray-400 ml-2">{med.dose}</span>}
                  </div>
                  <button
                    onClick={function() { removeMedication(index) }}
                    className="text-xs text-gray-400 hover:text-red-400 transition"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Medication name"
            value={form.medicationName}
            onChange={function(e) { setForm(function(p) { return { ...p, medicationName: e.target.value } }) }}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <input
            type="text"
            placeholder="Dose"
            value={form.medicationDose}
            onChange={function(e) { setForm(function(p) { return { ...p, medicationDose: e.target.value } }) }}
            onKeyDown={function(e) { if (e.key === 'Enter') addMedication() }}
            className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
          <button
            onClick={addMedication}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition font-medium"
          >
            Add
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
      >
        {loading ? 'Saving...' : saved ? 'Update medical history' : 'Save medical history'}
      </button>

      {saved && (
        <p className="text-center text-xs text-green-600 font-medium">
          Medical history saved
        </p>
      )}
    </div>
  )
}