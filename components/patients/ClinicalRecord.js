'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ClinicalRecord({ patient, visitId, visit, existing }) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [locking, setLocking] = useState(false)
  const [record, setRecord] = useState(existing || null)

  const medicalHistory = visit?.medicalHistory
  const findings = visit?.clinicalFindings
  const treatmentPlan = visit?.treatmentPlan
  const items = treatmentPlan?.treatmentItems || []

  const totalCost = items.reduce(function(sum, item) {
    return sum + (parseFloat(item.estimatedCost) || 0)
  }, 0)

  const toothFindings = findings?.toothFindings || {}
  const findingEntries = Object.entries(toothFindings)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          action: 'generate',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setRecord(data.record)
        router.refresh()
      } else {
        alert('Failed to generate record. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleLock() {
    if (!confirm('Lock this record? No edits will be possible without a logged reason.')) return
    setLocking(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          action: 'lock',
          recordId: record.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setRecord(data.record)
        router.refresh()
      } else {
        alert('Failed to lock record. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLocking(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Header actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-700">Clinical record</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {record?.lockedAt
                ? 'Locked on ' + new Date(record.lockedAt).toLocaleDateString('en-IN')
                : record
                ? 'Generated — not yet locked'
                : 'Not yet generated'}
            </p>
          </div>
          <div className="flex gap-2">
            {!record?.lockedAt && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {generating ? 'Generating...' : record ? 'Regenerate' : 'Generate record'}
              </button>
            )}
            {record && !record.lockedAt && (
              <button
                onClick={handleLock}
                disabled={locking}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900 transition disabled:opacity-50"
              >
                {locking ? 'Locking...' : 'Lock record'}
              </button>
            )}
          </div>
        </div>

        {record?.lockedAt && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
              Locked and finalised
            </span>
            <span className="text-xs text-gray-400">
              {new Date(record.lockedAt).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Record preview */}
      {record && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Record header */}
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">OraKare AI</h3>
                <p className="text-indigo-200 text-xs mt-0.5">Clinical Visit Record</p>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-medium">{patient.name}</p>
                <p className="text-indigo-200 text-xs">{patient.age}y · {patient.gender}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Patient info */}
            <div>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Patient information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-400">Mobile</span>
                  <span className="text-gray-700">{patient.mobile}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-400">ABHA ID</span>
                  <span className="text-gray-700">{patient.abhaId || 'Not linked'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-400">Visit date</span>
                  <span className="text-gray-700">
                    {new Date(record.generatedAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-1">
                  <span className="text-gray-400">Record ID</span>
                  <span className="text-gray-700 font-mono text-xs">{record.id.slice(-8).toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Chief complaint */}
            {medicalHistory?.chiefComplaint && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Chief complaint</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                  {medicalHistory.chiefComplaint}
                </p>
              </div>
            )}

            {/* Medical flags */}
            {(medicalHistory?.conditions?.length > 0 || medicalHistory?.allergies?.length > 0) && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Medical flags</h4>
                <div className="flex flex-wrap gap-2">
                  {(medicalHistory?.conditions || []).map(function(c) {
                    return (
                      <span key={c} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {c}
                      </span>
                    )
                  })}
                  {(medicalHistory?.allergies || []).map(function(a) {
                    return (
                      <span key={a} className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                        Allergy: {a}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Examination findings */}
            {findingEntries.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                  Examination findings
                </h4>
                <div className="grid grid-cols-2 gap-1">
                  {findingEntries.map(function(entry) {
                    return (
                      <div key={entry[0]} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5">
                        <span className="text-xs font-medium text-gray-500">Tooth {entry[0]}</span>
                        <span className="text-xs text-gray-700 capitalize">{entry[1]}</span>
                      </div>
                    )
                  })}
                </div>
                {findings?.clinicalNotes && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded px-3 py-2">
                    {findings.clinicalNotes}
                  </p>
                )}
              </div>
            )}

            {/* Treatment plan */}
            {items.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Treatment plan</h4>
                <div className="space-y-1">
                  {items.map(function(item, index) {
                    return (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                        <div>
                          <span className="text-sm text-gray-700">{item.procedureName}</span>
                          {item.toothRef && (
                            <span className="text-xs text-gray-400 ml-2">Tooth {item.toothRef}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{item.urgency}</span>
                          <span className="text-sm font-medium text-gray-700">
                            Rs.{parseFloat(item.estimatedCost || 0).toLocaleString('en-IN')}
                          </span>
                          <span className={'text-xs px-1.5 py-0.5 rounded ' +
                            (item.consentStatus === 'SIGNED' ? 'bg-green-100 text-green-700' :
                             item.consentStatus === 'DECLINED' ? 'bg-red-100 text-red-700' :
                             'bg-gray-100 text-gray-500')
                          }>
                            {item.consentStatus === 'SIGNED' ? 'Consented' :
                             item.consentStatus === 'DECLINED' ? 'Declined' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Total estimate</span>
                  <span className="text-sm font-medium text-indigo-600">
                    Rs.{totalCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Audit trail */}
            <div>
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Audit trail</h4>
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Record generated</span>
                  <span>{new Date(record.generatedAt).toLocaleString('en-IN')}</span>
                </div>
                {record.lockedAt && (
                  <div className="flex justify-between">
                    <span>Record locked</span>
                    <span>{new Date(record.lockedAt).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>AI assisted findings</span>
                  <span>Doctor reviewed and approved</span>
                </div>
                <div className="flex justify-between">
                  <span>Treatment consent</span>
                  <span>
                    {items.filter(function(i) { return i.consentStatus === 'SIGNED' }).length} of {items.length} signed
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {record?.lockedAt && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-green-800">Visit complete</p>
          <p className="text-xs text-green-600 mt-1">
            Clinical record locked and finalised. Follow-ups can be scheduled from the patient queue.
          </p>
          <Link
  href="/dashboard/patients"
  className="inline-block mt-3 text-sm text-indigo-600 hover:underline"
>
  Back to patient queue
</Link>
        </div>
      )}
    </div>
  )
}