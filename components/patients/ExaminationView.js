'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DentalChart from './DentalChart'
import AIFindings from './AIFindings'
import AIDraftPanel from './AIDraftPanel'

// Push #4 Wave 2: Top-to-bottom examination layout.
//   1. Clinical Findings (text)
//   2. Radiographical Findings (text)
//   3. AI-assisted Findings (image upload + analysis)
//   4. Dental Chart (tooth-by-tooth marking — visualization of all the above)
//
// The two text fields are owned here. They get passed down to DentalChart
// which still owns the save action (saves both findings text + tooth markings
// in one PUT). This avoids splitting the save flow across two endpoints.

export default function ExaminationView({ patient, visitId, existing, nextUrl }) {
  const router = useRouter()
  const [chartKey, setChartKey] = useState(0)
  const [examSaved, setExamSaved] = useState(
    !!existing?.clinicalFindings ||
    !!existing?.clinicalNotes ||
    !!existing?.radiographicalFindings ||
    Object.keys(existing?.toothFindings || {}).length > 0
  )

  // Findings text. Fall back from new field → old clinicalNotes for historical visits.
  const [clinicalFindings, setClinicalFindings] = useState(
    existing?.clinicalFindings || existing?.clinicalNotes || ''
  )
  const [radiographicalFindings, setRadiographicalFindings] = useState(
    existing?.radiographicalFindings || ''
  )

  const [mergedToothFindings, setMergedToothFindings] = useState(
    existing?.toothFindings ? { ...existing.toothFindings } : {}
  )

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

  // Snapshot passed to DentalChart on every render. DentalChart's save action
  // includes these values in its PUT request.
  const existingForChart = {
    toothFindings: mergedToothFindings,
    clinicalFindings,
    radiographicalFindings,
  }

  return (
    <div className="space-y-5">

      {/* 1. Clinical Findings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-700">Clinical findings</h2>
          <span className="text-xs text-slate-400">Observed in mouth</span>
        </div>
        <textarea
          value={clinicalFindings}
          onChange={function(e) { setClinicalFindings(e.target.value) }}
          placeholder="e.g. Caries on 14, 15. Mobility grade I on 31. Gingival recession upper left quadrant. Sensitivity on cold testing 26."
          rows={4}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <AIDraftPanel
          shorthand={clinicalFindings}
          kind="clinical"
          onAccept={function(text) { setClinicalFindings(text) }}
        />
      </div>

      {/* 2. Radiographical Findings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-700">Radiographical findings</h2>
          <span className="text-xs text-slate-400">Read from X-rays</span>
        </div>
        <textarea
          value={radiographicalFindings}
          onChange={function(e) { setRadiographicalFindings(e.target.value) }}
          placeholder="e.g. Periapical radiolucency on 14. Generalized horizontal bone loss. Impacted 38 mesioangular. Furcation involvement on 36."
          rows={3}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <AIDraftPanel
          shorthand={radiographicalFindings}
          kind="radiographical"
          onAccept={function(text) { setRadiographicalFindings(text) }}
        />
      </div>

      {/* 3. AI-assisted Findings */}
      <div>
        <AIFindings
          patient={patient}
          visitId={visitId}
          onFindingsConfirmed={handleFindingsConfirmed}
          existingFindings={mergedToothFindings}
        />
      </div>

      {/* 4. Dental Chart — visualization of everything above */}
      <div>
        <DentalChart
          key={chartKey}
          patient={patient}
          visitId={visitId}
          existing={existingForChart}
          onSaved={handleChartSaved}
        />
      </div>

      {/* Action bar */}
      <div className={'rounded-xl border px-5 py-4 transition-all ' + (
        examSaved
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-gray-50'
      )}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            {examSaved ? (
              <p className="text-sm font-medium text-green-800">Examination findings saved</p>
            ) : (
              <p className="text-sm text-gray-500">Save findings in the chart to proceed</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={function() { router.push('/dashboard/consultation/' + patient.id + '/' + visitId + '/close') }}
              disabled={!examSaved}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-all border ' + (
                examSaved
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed bg-white'
              )}
              title="End visit here — patient was examined but no treatment plan today"
            >
              Close visit
            </button>
            <button
              onClick={function() { router.push(nextUrl || '/dashboard/consultation/' + patient.id + '/' + visitId + '/treatment') }}
              disabled={!examSaved}
              className={'px-4 py-2 rounded-lg text-sm font-medium transition-all ' + (
                examSaved
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              Proceed to treatment plan →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
