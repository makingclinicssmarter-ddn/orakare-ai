'use client'

import { useState } from 'react'
import DentalChart from './DentalChart'
import AIFindings from './AIFindings'

export default function ExaminationView({ patient, visitId, existing }) {
  const [chartKey, setChartKey] = useState(0)
  const [mergedToothFindings, setMergedToothFindings] = useState(
    existing?.toothFindings ? { ...existing.toothFindings } : {}
  )
  const [mergedNotes, setMergedNotes] = useState(existing?.clinicalNotes || '')

  function handleFindingsConfirmed(confirmed) {
  const updated = { ...mergedToothFindings }
  confirmed.forEach(function(f) {
    updated[f.tooth] = f.condition
  })
  setMergedToothFindings(updated)
  setChartKey(function(k) {
    
    return k + 1
  })
}

  const existingForChart = {
    toothFindings: mergedToothFindings,
    clinicalNotes: mergedNotes,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DentalChart
        key={chartKey}
        patient={patient}
        visitId={visitId}
        existing={existingForChart}
      />
      <AIFindings
        patient={patient}
        visitId={visitId}
        onFindingsConfirmed={handleFindingsConfirmed}
      />
    </div>
  )
}