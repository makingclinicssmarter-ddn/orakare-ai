'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export default function VisitSummary({
  patient,
  visit,
  visitId,
  patientId,
  receipts,
  totalEstimate,
  totalCollected,
}) {
  const router = useRouter()
  const printRef = useRef(null)

  const balanceDue = Math.max(0, totalEstimate - totalCollected)
  const treatmentItems = visit.treatmentPlan?.treatmentItems || []
  const consentedItems = treatmentItems.filter(function(i) {
    return i.consentStatus === 'SIGNED'
  })

  const allSittings = consentedItems.flatMap(function(item) {
    return (item.sittings || []).map(function(s) {
      return { ...s, procedureName: item.procedureName, toothRef: item.toothRef }
    })
  }).sort(function(a, b) { return new Date(a.date) - new Date(b.date) })

  const toothFindings = visit.clinicalFindings?.toothFindings || {}

  function handlePrint() {
    window.print()
  }

  return (
    <div className="p-6 space-y-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-slate-900">Visit summary</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date(visit.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={function() { router.push('/dashboard/consultation') }}
            className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition"
          >
            New consultation
          </button>
          <button
            onClick={handlePrint}
            className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="space-y-4 print:p-8">

        {/* Clinic header — only shows on print */}
        <div className="hidden print:block text-center border-b border-slate-200 pb-4 mb-4">
          <h1 className="text-xl font-medium text-slate-900">Dr. Shobhna Bansal Dental Clinic</h1>
          <p className="text-sm text-slate-500">Dehradun, Uttarakhand</p>
          <p className="text-sm text-slate-500">orakaredental@gmail.com</p>
        </div>

        {/* Patient info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Patient details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Name</div>
              <div className="text-sm font-medium text-slate-900">{patient.name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Patient ID</div>
              <div className="text-sm text-slate-700">{patient.originalID || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Age / Gender</div>
              <div className="text-sm text-slate-700">{patient.age}y · {patient.gender}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Mobile</div>
              <div className="text-sm text-slate-700">{patient.mobile}</div>
            </div>
            {patient.address && (
              <div className="col-span-2">
                <div className="text-xs text-slate-400 mb-0.5">Address</div>
                <div className="text-sm text-slate-700">{patient.address}</div>
              </div>
            )}
          </div>
        </div>

        {/* Chief complaint */}
        {visit.medicalHistory?.chiefComplaint && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Chief complaint
            </h3>
            <p className="text-sm text-slate-700">{visit.medicalHistory.chiefComplaint}</p>
            {visit.medicalHistory.conditions?.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1">Medical conditions</div>
                <div className="flex flex-wrap gap-1">
                  {visit.medicalHistory.conditions.map(function(c, i) {
                    return (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {visit.medicalHistory.allergies?.length > 0 && (
              <div className="mt-2">
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

        {/* Examination findings */}
        {Object.keys(toothFindings).length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Examination findings
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(toothFindings).map(function(entry) {
                return (
                  <div key={entry[0]} className="flex items-center gap-2 text-sm">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      Tooth {entry[0]}
                    </span>
                    <span className="text-slate-700 capitalize">{entry[1]}</span>
                  </div>
                )
              })}
            </div>
            {visit.clinicalFindings?.clinicalNotes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-400 mb-1">Clinical notes</div>
                <p className="text-sm text-slate-700">{visit.clinicalFindings.clinicalNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Treatment plan */}
        {treatmentItems.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Treatment plan
            </h3>
            <div className="space-y-2">
              {treatmentItems.map(function(item, i) {
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
            <div className="flex justify-between mt-3 pt-3 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-700">Total estimate</span>
              <span className="text-sm font-medium text-primary-700">
                ₹{totalEstimate.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* Sittings */}
        {allSittings.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
              Sittings
            </h3>
            <div className="space-y-2">
              {allSittings.map(function(sitting, i) {
                return (
                  <div key={sitting.id} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-none">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-400">
                          {new Date(sitting.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs font-medium text-slate-600">
                          {sitting.procedureName}
                          {sitting.toothRef ? ' — Tooth ' + sitting.toothRef : ''}
                        </span>
                      </div>
                      <div className="text-sm text-slate-700">{sitting.description || '—'}</div>
                      {sitting.notes && (
                        <div className="text-xs text-slate-400 mt-0.5">{sitting.notes}</div>
                      )}
                    </div>
                    {sitting.paid > 0 && (
                      <div className="ml-4 text-right flex-shrink-0">
                        <div className="text-sm font-medium text-green-700">
                          ₹{sitting.paid.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-400">{sitting.payMode}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Payment summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Payment summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total estimate</span>
              <span className="text-slate-900">₹{totalEstimate.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total collected</span>
              <span className="text-green-700 font-medium">₹{totalCollected.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
              <span className="font-medium text-slate-800">Balance due</span>
              <span className={'font-medium ' + (balanceDue > 0 ? 'text-red-700' : 'text-green-700')}>
                ₹{balanceDue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Receipt breakdown */}
          {receipts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-400 mb-2">Payment receipts</div>
              <div className="space-y-1">
                {receipts.map(function(r) {
                  return (
                    <div key={r.id} className="flex justify-between text-xs text-slate-600">
                      <span>
                        {new Date(r.date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short'
                        })} · {r.paymentMode}
                        {r.notes ? ' · ' + r.notes : ''}
                      </span>
                      <span className="font-medium">₹{r.amount.toLocaleString('en-IN')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer — only on print */}
        <div className="hidden print:block text-center pt-4 border-t border-slate-200 text-xs text-slate-400">
          <p>Generated by OraKare AI · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="mt-1">This is a computer generated summary</p>
        </div>

      </div>
    </div>
  )
}