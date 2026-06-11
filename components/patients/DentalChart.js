'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CONDITIONS = [
  { id: 'caries', label: 'Caries', color: 'bg-amber-100 border-amber-400 text-amber-800' },
  { id: 'missing', label: 'Missing', color: 'bg-gray-100 border-gray-400 text-gray-600' },
  { id: 'rct', label: 'RCT done', color: 'bg-teal-100 border-teal-400 text-teal-800' },
  { id: 'crown', label: 'Crown', color: 'bg-blue-100 border-blue-400 text-blue-800' },
  { id: 'fracture', label: 'Fracture', color: 'bg-red-100 border-red-400 text-red-800' },
  { id: 'mobility', label: 'Mobility', color: 'bg-orange-100 border-orange-400 text-orange-800' },
  { id: 'sensitivity', label: 'Sensitivity', color: 'bg-purple-100 border-purple-400 text-purple-800' },
  { id: 'periapical', label: 'Periapical', color: 'bg-rose-100 border-rose-400 text-rose-800' },
  { id: 'erupting', label: 'Erupting', color: 'bg-cyan-100 border-cyan-400 text-cyan-800' },
  { id: 'healthy', label: 'Healthy', color: 'bg-green-100 border-green-400 text-green-800' },
]

const TOOTH_COLORS = {
  caries: 'bg-amber-100 border-amber-400',
  missing: 'bg-gray-200 border-gray-400',
  rct: 'bg-teal-100 border-teal-400',
  crown: 'bg-blue-100 border-blue-400',
  fracture: 'bg-red-100 border-red-400',
  mobility: 'bg-orange-100 border-orange-400',
  sensitivity: 'bg-purple-100 border-purple-400',
  periapical: 'bg-rose-100 border-rose-400',
  erupting: 'bg-cyan-100 border-cyan-400',
  healthy: 'bg-green-100 border-green-400',
}

const ADULT_UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const ADULT_UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
const ADULT_LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]
const ADULT_LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]

const PRIMARY_UPPER_RIGHT = [55, 54, 53, 52, 51]
const PRIMARY_UPPER_LEFT = [61, 62, 63, 64, 65]
const PRIMARY_LOWER_LEFT = [71, 72, 73, 74, 75]
const PRIMARY_LOWER_RIGHT = [85, 84, 83, 82, 81]

const MIXED_UPPER_RIGHT_PERM = [18, 17, 16, 15, 14, 13, 12, 11]
const MIXED_UPPER_LEFT_PERM = [21, 22, 23, 24, 25, 26, 27, 28]
const MIXED_LOWER_LEFT_PERM = [31, 32, 33, 34, 35, 36, 37, 38]
const MIXED_LOWER_RIGHT_PERM = [48, 47, 46, 45, 44, 43, 42, 41]

function getChartType(age) {
  if (age < 6) return 'primary'
  if (age <= 12) return 'mixed'
  return 'adult'
}

function ToothButton({ tooth, findings, selectedTooth, presentationMode, onSelect, onClear, small }) {
  const condition = findings[tooth]
  const colorClass = condition
    ? TOOTH_COLORS[condition] || 'bg-white border-gray-200'
    : 'bg-white border-gray-200 hover:border-indigo-300'
  const size = small ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-xs'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={function() { onSelect(tooth) }}
        className={'rounded-lg border-2 font-medium transition ' + size + ' ' + colorClass + (selectedTooth === tooth ? ' ring-2 ring-indigo-500' : '')}
      >
        <span className={'leading-none ' + (condition ? '' : 'text-gray-400')}>
          {tooth}
        </span>
      </button>
      {condition && !presentationMode && (
        <button
          onClick={function() { onClear(tooth) }}
          className="text-gray-300 hover:text-red-400 text-xs leading-none"
        >
          x
        </button>
      )}
      {presentationMode && condition && (
        <span className="text-xs text-gray-500 leading-none capitalize" style={{fontSize: '9px'}}>{condition}</span>
      )}
    </div>
  )
}

function ToothRow({ teeth, findings, selectedTooth, presentationMode, onSelect, onClear, small }) {
  return (
    <div className="flex gap-1 justify-center">
      {teeth.map(function(tooth) {
        return (
          <ToothButton
            key={tooth}
            tooth={tooth}
            findings={findings}
            selectedTooth={selectedTooth}
            presentationMode={presentationMode}
            onSelect={onSelect}
            onClear={onClear}
            small={small}
          />
        )
      })}
    </div>
  )
}

function AdultChart({ findings, selectedTooth, presentationMode, onSelect, onClear }) {
  return (
    <div>
      <p className="text-xs text-gray-400 text-center mb-1">Upper jaw</p>
      <div className="flex justify-center gap-4">
        <ToothRow teeth={ADULT_UPPER_RIGHT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
        <div className="w-px bg-gray-200" />
        <ToothRow teeth={ADULT_UPPER_LEFT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
      </div>
      <div className="border-t border-dashed border-gray-200 my-3" />
      <div className="flex justify-center gap-4">
        <ToothRow teeth={ADULT_LOWER_RIGHT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
        <div className="w-px bg-gray-200" />
        <ToothRow teeth={ADULT_LOWER_LEFT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
      </div>
      <p className="text-xs text-gray-400 text-center mt-1">Lower jaw</p>
    </div>
  )
}

function PrimaryChart({ findings, selectedTooth, presentationMode, onSelect, onClear }) {
  return (
    <div>
      <p className="text-xs text-gray-400 text-center mb-1">Upper jaw — primary teeth</p>
      <div className="flex justify-center gap-4">
        <ToothRow teeth={PRIMARY_UPPER_RIGHT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
        <div className="w-px bg-gray-200" />
        <ToothRow teeth={PRIMARY_UPPER_LEFT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
      </div>
      <div className="border-t border-dashed border-gray-200 my-3" />
      <div className="flex justify-center gap-4">
        <ToothRow teeth={PRIMARY_LOWER_RIGHT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
        <div className="w-px bg-gray-200" />
        <ToothRow teeth={PRIMARY_LOWER_LEFT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
      </div>
      <p className="text-xs text-gray-400 text-center mt-1">Lower jaw — primary teeth</p>
    </div>
  )
}

function MixedChart({ findings, selectedTooth, presentationMode, onSelect, onClear }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-gray-400 text-center mb-1">Upper jaw — permanent teeth</p>
        <div className="flex justify-center gap-4">
          <ToothRow teeth={MIXED_UPPER_RIGHT_PERM} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
          <div className="w-px bg-gray-200" />
          <ToothRow teeth={MIXED_UPPER_LEFT_PERM} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
        </div>
      </div>

      <div className="border border-dashed border-indigo-100 rounded-lg p-2 bg-indigo-50">
        <p className="text-xs text-indigo-400 text-center mb-1">Primary teeth still present</p>
        <div className="flex justify-center gap-2 mb-1">
          <ToothRow teeth={PRIMARY_UPPER_RIGHT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} small={true} />
          <div className="w-px bg-indigo-200" />
          <ToothRow teeth={PRIMARY_UPPER_LEFT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} small={true} />
        </div>
        <div className="border-t border-dashed border-indigo-200 my-1" />
        <div className="flex justify-center gap-2 mt-1">
          <ToothRow teeth={PRIMARY_LOWER_RIGHT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} small={true} />
          <div className="w-px bg-indigo-200" />
          <ToothRow teeth={PRIMARY_LOWER_LEFT} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} small={true} />
        </div>
      </div>

      <div>
        <div className="flex justify-center gap-4">
          <ToothRow teeth={MIXED_LOWER_RIGHT_PERM} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
          <div className="w-px bg-gray-200" />
          <ToothRow teeth={MIXED_LOWER_LEFT_PERM} findings={findings} selectedTooth={selectedTooth} presentationMode={presentationMode} onSelect={onSelect} onClear={onClear} />
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">Lower jaw — permanent teeth</p>
      </div>
    </div>
  )
}

export default function DentalChart({ patient, visitId, existing, onSaved }) {
  const router = useRouter()
  const patientAge = patient?.age || 0
  const autoType = getChartType(patientAge)

  const [chartType, setChartType] = useState(autoType)
  const [findings, setFindings] = useState(
    existing?.toothFindings ? { ...existing.toothFindings } : {}
  )
  const [selectedTooth, setSelectedTooth] = useState(null)
  const [notes, setNotes] = useState(existing?.clinicalNotes || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)

  function selectTooth(toothNumber) {
    setSelectedTooth(toothNumber)
  }

  function setCondition(condition) {
    setFindings(function(prev) {
      return { ...prev, [selectedTooth]: condition }
    })
    setSelectedTooth(null)
    setSaved(false)
  }

  function clearTooth(toothNumber) {
    setFindings(function(prev) {
      const next = { ...prev }
      delete next[toothNumber]
      return next
    })
    setSaved(false)
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/examination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          toothFindings: findings,
          clinicalNotes: notes,
        }),
      })
      if (res.ok) {
        setSaved(true)
        router.refresh()
        if (onSaved) onSaved()
      } else {
        alert('Something went wrong. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const chartTypeLabels = {
    adult: 'Adult (permanent)',
    primary: 'Primary (milk teeth)',
    mixed: 'Mixed dentition',
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
        <div className="flex items-center justify-between mb-4 min-w-[600px]">
          <div>
            <h2 className="text-sm font-medium text-gray-700">
              Dental chart
              <span className="ml-2 text-xs font-normal text-gray-400">
                {presentationMode ? '— presentation mode' : '— clinical mode'}
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {Object.keys(findings).length} findings · {chartTypeLabels[chartType]}
              {chartType !== autoType && (
                <button
                  onClick={function() { setChartType(autoType) }}
                  className="ml-2 text-indigo-500 hover:underline"
                >
                  (reset to auto)
                </button>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={chartType}
              onChange={function(e) { setChartType(e.target.value) }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="adult">Adult</option>
              <option value="primary">Primary</option>
              <option value="mixed">Mixed</option>
            </select>
            <button
              onClick={function() { setPresentationMode(function(p) { return !p }) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              {presentationMode ? 'Clinical mode' : 'Present to patient'}
            </button>
          </div>
        </div>

        {chartType === 'adult' && (
          <AdultChart
            findings={findings}
            selectedTooth={selectedTooth}
            presentationMode={presentationMode}
            onSelect={selectTooth}
            onClear={clearTooth}
          />
        )}

        {chartType === 'primary' && (
          <PrimaryChart
            findings={findings}
            selectedTooth={selectedTooth}
            presentationMode={presentationMode}
            onSelect={selectTooth}
            onClear={clearTooth}
          />
        )}

        {chartType === 'mixed' && (
          <MixedChart
            findings={findings}
            selectedTooth={selectedTooth}
            presentationMode={presentationMode}
            onSelect={selectTooth}
            onClear={clearTooth}
          />
        )}

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          {CONDITIONS.map(function(c) {
            return (
              <span key={c.id} className={'text-xs px-2 py-0.5 rounded-full border ' + c.color}>
                {c.label}
              </span>
            )
          })}
        </div>
      </div>

      {selectedTooth && (
        <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Tooth {selectedTooth} — select condition
            </p>
            <button
              onClick={function() { setSelectedTooth(null) }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              x
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CONDITIONS.map(function(c) {
              return (
                <button
                  key={c.id}
                  onClick={function() { setCondition(c.id) }}
                  className={'text-xs px-3 py-2 rounded-lg border-2 font-medium transition hover:opacity-80 ' + c.color}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!presentationMode && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Clinical notes</h2>
          <textarea
            value={notes}
            onChange={function(e) { setNotes(e.target.value) }}
            placeholder="Percussion test results, sensitivity findings, patient-reported symptoms..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      {presentationMode && Object.keys(findings).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Findings summary</h2>
          <div className="space-y-2">
            {Object.entries(findings).map(function(entry) {
              const tooth = entry[0]
              const condition = entry[1]
              const cond = CONDITIONS.find(function(c) { return c.id === condition })
              return (
                <div key={tooth} className="flex items-center gap-3">
                  <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' + (cond ? cond.color : '')}>
                    Tooth {tooth}
                  </span>
                  <span className="text-sm text-gray-600 capitalize">{condition}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!presentationMode && (
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : saved ? 'Findings saved' : 'Save examination findings'}
        </button>
      )}
    </div>
  )
}