'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TreatmentConsent from '@/components/patients/TreatmentConsent'

export default function ConsentScreen({ patient, visitId, patientId, items }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedParam = searchParams.get('selected')

  const selectedIds = selectedParam ? selectedParam.split(',') : []
  const filteredItems = selectedIds.length > 0
    ? items.filter(function(item) { return selectedIds.includes(item.id) })
    : items

  const [itemState, setItemState] = useState(filteredItems)

  const allConsented = itemState.length > 0 && itemState.every(function(item) {
    return item.consentStatus === 'SIGNED' || item.consentStatus === 'DECLINED'
  })

  function handleConsentComplete(signedItems) {
    setItemState(function(prev) {
      return prev.map(function(item) {
        const match = signedItems.find(function(s) { return s.id === item.id })
        return match ? { ...item, consentStatus: 'SIGNED' } : item
      })
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Treatments requiring consent today
        </h3>
        <div className="space-y-2">
          {itemState.map(function(item, i) {
            return (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-none">
                <div>
                  <div className="text-sm text-slate-800">{item.procedureName}</div>
                  {item.toothRef && (
                    <div className="text-xs text-slate-400">Tooth {item.toothRef}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-600">
                    ₹{parseFloat(item.estimatedCost || 0).toLocaleString('en-IN')}
                  </div>
                  <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (
                    item.consentStatus === 'SIGNED'
                      ? 'bg-green-50 text-green-700'
                      : item.consentStatus === 'DECLINED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                  )}>
                    {item.consentStatus === 'SIGNED' ? 'Consented' :
                     item.consentStatus === 'DECLINED' ? 'Declined' : 'Pending'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-4 pt-3 border-t border-slate-200">
          <span className="text-sm font-medium text-slate-700">Total</span>
          <span className="text-sm font-medium text-primary-700">
            ₹{itemState.reduce(function(s, i) {
              return s + parseFloat(i.estimatedCost || 0)
            }, 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {!allConsented && (
        <TreatmentConsent
          patient={patient}
          visitId={visitId}
          items={itemState}
          onConsentComplete={handleConsentComplete}
        />
      )}

      {allConsented && (
        <div className="space-y-3">
          {(() => {
            const hasAnySigned = itemState.some(function(i) { return i.consentStatus === 'SIGNED' })
            const allDeclined = itemState.every(function(i) { return i.consentStatus === 'DECLINED' })

            if (allDeclined) {
              // Patient declined every treatment → ADVISED outcome
              return (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-amber-800">
                      All treatments declined
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Close the visit to record advice and any charges given today.
                    </p>
                  </div>
                  <button
                    onClick={function() {
                      router.push('/dashboard/consultation/' + patientId + '/' + visitId + '/close')
                    }}
                    className="w-full bg-amber-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-amber-700 transition"
                  >
                    Close visit →
                  </button>
                </div>
              )
            }

            // At least one consent signed → branch into Start vs Schedule
            return (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-green-800">
                    Consent collected{hasAnySigned ? '' : ''}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Start treatment now, or schedule the first sitting for later.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={function() {
                      // Schedule path: close visit with CONSENTED outcome.
                      // Dr. Shobhna picks the next-appointment date on the Close screen.
                      router.push('/dashboard/consultation/' + patientId + '/' + visitId + '/close')
                    }}
                    className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition bg-white"
                    title="Sitting deferred — patient will return on a scheduled date"
                  >
                    Schedule (close visit)
                  </button>
                  <button
                    onClick={function() {
                      router.push('/dashboard/consultation/' + patientId + '/' + visitId + '/sittings')
                    }}
                    className="flex-1 bg-primary-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-800 transition"
                  >
                    Start treatment now →
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}