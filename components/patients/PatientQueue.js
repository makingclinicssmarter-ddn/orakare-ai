'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RegisterPatientForm from './RegisterPatientForm'

const STATUS_CONFIG = {
  REGISTERED: { label: 'Waiting', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  HISTORY_TAKEN: { label: 'History done', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  EXAM_CONSENT_SIGNED: { label: 'Consent signed', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
  EXAMINATION_DONE: { label: 'Examined', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
  DIAGNOSIS_DONE: { label: 'Diagnosed', color: 'bg-purple-50 text-purple-700 border border-purple-200' },
  TREATMENT_PLANNED: { label: 'Plan ready', color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  TREATMENT_CONSENT_SIGNED: { label: 'Ready', color: 'bg-green-50 text-green-700 border border-green-200' },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-cyan-100 text-cyan-700',
]

export default function PatientQueue({ patients }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  function goToPatient(id) {
    router.push('/dashboard/patients/' + id)
  }

  const waiting = patients.filter(function(p) {
    return p.visits[0]?.status !== 'COMPLETED'
  })
  const completed = patients.filter(function(p) {
    return p.visits[0]?.status === 'COMPLETED'
  })

  return (
    <div className="flex min-h-screen">

      {/* Main content */}
      <div className="flex-1 p-6">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Patient queue</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}
              {patients.length} patient{patients.length !== 1 ? 's' : ''} today
            </p>
          </div>
          <button
            onClick={function() { setShowForm(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New patient
          </button>
        </div>

        {/* Empty state */}
        {patients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No patients today</p>
            <p className="text-xs text-gray-400 mb-4">Register your first patient to get started</p>
            <button
              onClick={function() { setShowForm(true) }}
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              Register a patient
            </button>
          </div>
        )}

        {/* Waiting patients */}
        {waiting.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              In progress · {waiting.length}
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {waiting.map(function(patient, index) {
                const visit = patient.visits[0]
                const status = STATUS_CONFIG[visit?.status] || STATUS_CONFIG.REGISTERED
                const initials = patient.name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0, 2)
                const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]

                return (
                  <div
                    key={patient.id}
                    onClick={function() { goToPatient(patient.id) }}
                    className={'flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition ' +
                      (index < waiting.length - 1 ? 'border-b border-gray-50' : '')}
                  >
                    <div className={'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 ' + avatarColor}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{patient.age}y · {patient.gender} · {patient.mobile}</p>
                    </div>
                    {patient.abhaId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100 flex-shrink-0">
                        ABHA
                      </span>
                    )}
                    <span className={'text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ' + status.color}>
                      {status.label}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed patients */}
        {completed.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Completed · {completed.length}
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm opacity-60">
              {completed.map(function(patient, index) {
                const initials = patient.name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0, 2)

                return (
                  <div
                    key={patient.id}
                    onClick={function() { goToPatient(patient.id) }}
                    className={'flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition ' +
                      (index < completed.length - 1 ? 'border-b border-gray-50' : '')}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold flex-shrink-0 bg-gray-100 text-gray-500">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{patient.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{patient.age}y · {patient.gender}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500 border border-gray-200">
                      Completed
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Registration form slide-in */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-40"
            onClick={function() { setShowForm(false) }}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">Register patient</h2>
                <button
                  onClick={function() { setShowForm(false) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <RegisterPatientForm onClose={function() { setShowForm(false) }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}