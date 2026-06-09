'use client'

import { useRouter } from 'next/navigation'

const STEPS = [
  { n: 1, label: 'History', path: 'start' },
  { n: 2, label: 'Examination', path: 'examination' },
  { n: 3, label: 'Treatment plan', path: 'treatment' },
  { n: 4, label: 'Consent', path: 'consent' },
  { n: 5, label: 'Sittings', path: 'sittings' },
]

function PatientPanel({ patient, visit }) {
  const dentalHistory = (() => {
    if (!patient.dentalHistory) return []
    const dh = typeof patient.dentalHistory === 'string'
      ? JSON.parse(patient.dentalHistory)
      : patient.dentalHistory
    return dh?.history || []
  })()

  const personalHistory = (() => {
    if (!patient.personalHistory) return []
    const ph = typeof patient.personalHistory === 'string'
      ? JSON.parse(patient.personalHistory)
      : patient.personalHistory
    return ph?.habits || []
  })()

  const conditions = visit?.medicalHistory?.conditions || []
  const allergies = visit?.medicalHistory?.allergies || []
  const medications = visit?.medicalHistory?.medications || []
  const chiefComplaint = visit?.medicalHistory?.chiefComplaint || ''

  return (
    <div className="w-72 min-w-72 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
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

      {/* Chief complaint */}
      {chiefComplaint && (
        <div className="p-5 border-b border-slate-100">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Chief complaint
          </div>
          <div className="text-sm text-slate-700 leading-relaxed">{chiefComplaint}</div>
        </div>
      )}

      {/* Medical history */}
      {(conditions.length > 0 || allergies.length > 0 || medications.length > 0) && (
        <div className="p-5 border-b border-slate-100 space-y-3">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Medical history
          </div>
          {conditions.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Conditions</div>
              <div className="flex flex-wrap gap-1">
                {conditions.map(function(c, i) {
                  return (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {c}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {allergies.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Allergies</div>
              <div className="flex flex-wrap gap-1">
                {allergies.map(function(a, i) {
                  return (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                      {a}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
          {medications.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Medications</div>
              <div className="flex flex-wrap gap-1">
                {medications.map(function(m, i) {
                  return (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      {m}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dental history */}
      {dentalHistory.length > 0 && (
        <div className="p-5 border-b border-slate-100">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Dental history
          </div>
          <div className="flex flex-wrap gap-1">
            {dentalHistory.map(function(item, i) {
              return (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                  {item}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Personal history */}
      {personalHistory.length > 0 && (
        <div className="p-5">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Personal history
          </div>
          <div className="flex flex-wrap gap-1">
            {personalHistory.map(function(habit, i) {
              return (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {habit}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConsultationLayout({ patient, visit, visitId, patientId, activeStep, children }) {
  const router = useRouter()

  function goToStep(step) {
    const base = '/dashboard/consultation/' + patientId + '/' + visitId
    router.push(base + '/' + step.path)
  }

  return (
    <div className="flex h-full">
      <PatientPanel patient={patient} visit={visit} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Step bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2 flex-shrink-0">
          {STEPS.map(function(step, i) {
            const isDone = step.n < activeStep
            const isActive = step.n === activeStep
            return (
              <div key={step.n} className="flex items-center gap-2">
                <button
                  onClick={function() { if (isDone) goToStep(step) }}
                  disabled={!isDone}
                  className={'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ' + (
                    isActive
                      ? 'bg-primary-700 text-white'
                      : isDone
                        ? 'bg-primary-50 text-primary-700 cursor-pointer hover:bg-primary-100'
                        : 'text-slate-400 cursor-default'
                  )}
                >
                  {isDone && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>{step.n}</span>
                  <span>{step.label}</span>
                </button>
                {i < 4 && (
                  <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}