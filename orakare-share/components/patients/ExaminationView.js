'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DentalChart from './DentalChart'
import AIFindings from './AIFindings'


  const router = useRouter()
  const [chartKey, setChartKey] = useState(0)
  const [examSaved, setExamSaved] = useState(!!existing?.clinicalNotes || Object.keys(existing?.toothFindings || {}).length > 0)
  const [mergedToothFindings, setMergedToothFindings] = useState(
    existing?.toothFindings ? { ...existing.toothFindings } : {}
  )
  const [mergedNotes, setMergedNotes] = useState(existing?.clinicalNotes || '')

  function handleFindingsConfirmed(confirmed) {
    const updated = { ...mergedToothFindings }
    confirmed.forEach(function(f) {
      if (!updated[f.tooth]) {
        updated[f.tooth] = f.condition
      }
    })
    setMergedToothFindings(updated)
    setChartKey(function(k) { return k + 1 })
  }

  function handleChartSaved() {
    setExamSaved(true)
  }

  const existingForChart = {
    toothFindings: mergedToothFindings,
    clinicalNotes: mergedNotes,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DentalChart
          key={chartKey}
          patient={patient}
          visitId={visitId}
          existing={existingForChart}
          onSaved={handleChartSaved}
        />
        <AIFindings
          patient={patient}
          visitId={visitId}
          onFindingsConfirmed={handleFindingsConfirmed}
          existingFindings={mergedToothFindings}
        />
      </div>

      {/* Proceed bar — shown once findings are saved */}
      <div className={`flex items-center justify-between rounded-xl border px-5 py-4 transition-all ${
        examSaved
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      }`}>
        <div>
          {examSaved ? (
            <p className="text-sm font-medium text-green-800">Examination findings saved</p>
          ) : (
            <p className="text-sm text-gray-500">Save findings in the chart to proceed</p>
          )}
        </div>
        <button
          onClick={() => router.push(`/dashboard/patients/${patient.id}/treatment`)}
          disabled={!examSaved}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            examSaved
              ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Proceed to Treatment Planning →
        </button>
      </div>
    </div>
  )
}