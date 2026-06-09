'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TreatmentConsent from '@/components/patients/TreatmentConsent'

export default function ConsentScreen({ patient, visitId, patientId, items }) {
  const router = useRouter()
  const [items_state, setItems] = useState(items)

  const allConsented = items_state.length > 0 && items_state.every(function(item) {
    return item.consentStatus === 'SIGNED' || item.consentStatus === 'DECLINED'
  })

  function handleConsentComplete(signedItems) {
    setItems(function(prev) {
      return prev.map(function(item) {
        const match = signedItems.find(function(s) { return s.id === item.id })
        return match ? { ...item, consentStatus: 'SIGNED' } : item
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* Treatment items summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Procedures requiring consent
        </h3>
        <div className="space-y-2">
          {items_state.map(function(item, i) {
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
          <span className="text-sm font-medium text-slate-700">Total estimate</span>
          <span className="text-sm font-medium text-primary-700">
            ₹{items_state.reduce(function(s, i) {
              return s + parseFloat(i.estimatedCost || 0)
            }, 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {!allConsented && (
        <TreatmentConsent
          patient={patient}
          visitId={visitId}
          items={items_state}
          onConsentComplete={handleConsentComplete}
        />
      )}

      {allConsented && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-medium text-green-800">All consents collected</p>
            <p className="text-xs text-green-600 mt-1">
              Treatment can now begin. Proceed to sittings.
            </p>
          </div>
          <button
            onClick={function() {
              router.push('/dashboard/consultation/' + patientId + '/' + visitId + '/sittings')
            }}
            className="w-full bg-primary-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-800 transition"
          >
            Proceed to sittings →
          </button>
        </div>
      )}
    </div>
  )
}