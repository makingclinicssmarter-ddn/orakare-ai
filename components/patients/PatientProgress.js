'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const STEPS = [
  { key: 'registration', label: 'Registration', path: '' },
  { key: 'history', label: 'History', path: '' },
  { key: 'consent', label: 'Consent', path: '' },
  { key: 'examination', label: 'Examination', path: '/examination' },
  { key: 'treatment', label: 'Treatment', path: '/treatment' },
  { key: 'record', label: 'Record', path: '/record' },
]

const STATUS_TO_STEP = {
  REGISTERED: 0,
  HISTORY_TAKEN: 1,
  EXAM_CONSENT_SIGNED: 2,
  EXAMINATION_DONE: 3,
  DIAGNOSIS_DONE: 3,
  TREATMENT_PLANNED: 4,
  TREATMENT_CONSENT_SIGNED: 4,
  COMPLETED: 5,
}

export default function PatientProgress({ patientId, visitStatus }) {
  const pathname = usePathname()
  const currentStep = STATUS_TO_STEP[visitStatus] || 0

  function getStepHref(step, index) {
    if (index === 0 || index === 1 || index === 2) {
      return '/dashboard/patients/' + patientId
    }
    return '/dashboard/patients/' + patientId + step.path
  }

  function getStepState(index) {
    if (index < currentStep) return 'done'
    if (index === currentStep) return 'current'
    return 'upcoming'
  }

  return (
    <div className="bg-white border-b border-gray-100 px-6 py-3">
      <div className="flex items-center gap-1">
        {STEPS.map(function(step, index) {
          const state = getStepState(index)
          const href = getStepHref(step, index)
          const isClickable = index <= currentStep

          return (
            <div key={step.key} className="flex items-center">
              {isClickable ? (
                <Link href={href} className="flex items-center gap-1.5 group">
                  <div className={
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition ' +
                    (state === 'done' ? 'bg-indigo-600 text-white' :
                     state === 'current' ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' :
                     'bg-gray-100 text-gray-400')
                  }>
                    {state === 'done' ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={
                    'text-xs font-medium transition ' +
                    (state === 'done' ? 'text-indigo-600' :
                     state === 'current' ? 'text-indigo-700' :
                     'text-gray-400')
                  }>
                    {step.label}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium bg-gray-100 text-gray-300">
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium text-gray-300">{step.label}</span>
                </div>
              )}

              {index < STEPS.length - 1 && (
                <div className={'mx-2 h-px w-6 ' + (index < currentStep ? 'bg-indigo-300' : 'bg-gray-200')} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}