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

  const toggleCondition = (condition) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition]
    }))
  }

  const toggleAllergy = (allergy) => {
    setForm(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }))
  }

  const addCustomCondition = () => {
    if (!form.customCondition.trim()) return
    setForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, prev.customCondition.trim()],
      customCondition: ''
    }))
  }

  const addCustomAllergy = () => {
    if (!form.customAllergy.trim()) return
    setForm(prev => ({
      ...prev,
      allergies: [...prev.allergies, prev.customAllergy.trim()],
      customAllergy: ''
    }))
  }

  const addMedication = () => {
    if (!form.medicationName.trim()) return
    setForm(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: prev.medicationName.trim(),
        dose: prev.medicationDose.trim()
      }],
      medicationName: '',
      medicationDose: '',
    }))
  }

  const removeMedication = (index) => {
    setForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    if (!form.chiefComplaint.trim()) {
      alert('Please enter the chief complaint')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/patients/${patient.id}/medical-history`, {
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
    <div className="space-y-6">

      {/* Chief Complaint */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Chief complaint <span className="text-red-400">*</span>
        </h2>
        <textarea
          placeholder="What brings you in today? Describe your main concern..."
          value={form.chiefComplaint}
          onChange={e => setForm({ ...form, chiefComplaint: e.target.value })}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Medical Conditions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Medical conditions</h2>
        <p className="text-xs text-gray-400 mb-3">Select all that apply</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_CONDITIONS.map(condition => (
            <button
              key={condition}
              onClick={() => toggleCondition(condition)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                form.conditions.includes(condition)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {condition}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add other condition..."
            value={form.customCondition}
            onChange={e => setForm({ ...form, customCondition: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addCustomCondition()}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addCustomCondition}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
        {form.conditions.filter(c => !COMMON_CONDITIONS.includes(c)).map(c => (
          <span key={c} className="inline-flex items-center gap-1 mt-2 mr-2 text-xs px-3 py-1.5 rounded-full bg-indigo-600 text-white">
            {c}
            <button onClick={() => toggleCondition(c)} className="ml-1 hover:opacity-70">✕</button>
          </span>
        ))}
      </div>

      {/* Allergies */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Known allergies</h2>
        <p className="text-xs text-gray-400 mb-3">Especially important for anaesthesia and medications</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_ALLERGIES.map(allergy => (
            <button
              key={allergy}
              onClick={() => toggleAllergy(allergy)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                form.allergies.includes(allergy)
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
              }`}
            >
              {allergy}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add other allergy..."
            value={form.customAllergy}
            onChange={e => setForm({ ...form, customAllergy: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addCustomAllergy()}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addCustomAllergy}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Medications */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Current medications</h2>
        <p className="text-xs text-gray-400 mb-3">Blood thinners, diabetes medication etc. affect treatment decisions</p>

        {form.medications.length > 0 && (
          <div className="mb-3 space-y-2">
            {form.medications.map((med, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">{med.name}</span>
                  {med.dose && <span className="text-xs text-gray-400 ml-2">{med.dose}</span>}
                </div>
                <button
                  onClick={() => removeMedication(index)}
                  className="text-gray-400 hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Medication name"
            value={form.medicationName}
            onChange={e => setForm({ ...form, medicationName: e.target.value })}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Dose (optional)"
            value={form.medicationDose}
            onChange={e => setForm({ ...form, medicationDose: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addMedication()}
            className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addMedication}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? 'Saving...' : saved ? 'Update medical history' : 'Save medical history'}
      </button>

      {saved && (
        <p className="text-center text-xs text-green-600">
          ✓ Medical history saved
        </p>
      )}
    </div>
  )
}