'use client'

import { useState } from 'react'
import RegisterPatientForm from './RegisterPatientForm'

export default function PatientQueue({ patients }) {
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const statusColors = {
    REGISTERED: 'bg-blue-100 text-blue-700',
    HISTORY_TAKEN: 'bg-yellow-100 text-yellow-700',
    EXAM_CONSENT_SIGNED: 'bg-yellow-100 text-yellow-700',
    EXAMINATION_DONE: 'bg-purple-100 text-purple-700',
    DIAGNOSIS_DONE: 'bg-purple-100 text-purple-700',
    TREATMENT_PLANNED: 'bg-orange-100 text-orange-700',
    TREATMENT_CONSENT_SIGNED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-gray-100 text-gray-600',
  }

  const statusLabels = {
    REGISTERED: 'Waiting',
    HISTORY_TAKEN: 'History taken',
    EXAM_CONSENT_SIGNED: 'Consent signed',
    EXAMINATION_DONE: 'Examined',
    DIAGNOSIS_DONE: 'Diagnosed',
    TREATMENT_PLANNED: 'Plan ready',
    TREATMENT_CONSENT_SIGNED: 'Ready for treatment',
    COMPLETED: 'Completed',
  }

  return (
    <div className="flex gap-6 p-6 min-h-screen bg-gray-50">

      {/* Left — Patient Queue */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-medium text-gray-900">Today's patients</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            + New patient
          </button>
        </div>

        {patients.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No patients today yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-indigo-600 text-sm hover:underline"
            >
              Register first patient →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {patients.map((patient, index) => {
              const latestVisit = patient.visits[0]
              const initials = patient.name.split(' ').map(n => n[0]).join('').toUpperCase()
              const colors = ['bg-indigo-100 text-indigo-700', 'bg-teal-100 text-teal-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700']
              const color = colors[index % colors.length]

              return (
                <div
                  key={patient.id}
                  onClick={() => setSelected(patient)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${color}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                    <div className="text-xs text-gray-500">{patient.age}y · {patient.gender}</div>
                  </div>
                  {latestVisit && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[latestVisit.status]}`}>
                      {statusLabels[latestVisit.status]}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right — Register form or patient detail */}
      <div className="w-96">
        {showForm ? (
          <RegisterPatientForm onClose={() => setShowForm(false)} />
        ) : selected ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-gray-900">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span className="text-gray-400">Age</span><span>{selected.age}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Gender</span><span>{selected.gender}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Mobile</span><span>{selected.mobile}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">ABHA ID</span><span>{selected.abhaId || '—'}</span></div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Select a patient to view details</p>
          </div>
        )}
      </div>

      {/* Modal overlay for form */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-10"
          onClick={() => setShowForm(false)}
        />
      )}
    </div>
  )
}