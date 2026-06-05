'use client'

import { useState } from 'react'

const CONDITION_COLORS = {
  caries: 'bg-amber-100 border-amber-400 text-amber-800',
  missing: 'bg-gray-100 border-gray-400 text-gray-600',
  rct: 'bg-teal-100 border-teal-400 text-teal-800',
  crown: 'bg-blue-100 border-blue-400 text-blue-800',
  fracture: 'bg-red-100 border-red-400 text-red-800',
  mobility: 'bg-orange-100 border-orange-400 text-orange-800',
  sensitivity: 'bg-purple-100 border-purple-400 text-purple-800',
  periapical: 'bg-rose-100 border-rose-400 text-rose-800',
  healthy: 'bg-green-100 border-green-400 text-green-800',
}

const CONFIDENCE_COLORS = {
  high: 'text-green-600',
  medium: 'text-amber-600',
  low: 'text-gray-400',
}

export default function AIFindings({ patient, visitId, onFindingsConfirmed }) {
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [decisions, setDecisions] = useState({})
  const [analysed, setAnalysed] = useState(false)

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
    setSuggestions([])
    setDecisions({})
    setAnalysed(false)
  }

  async function handleAnalyse() {
    if (!image) {
      alert('Please upload an image first')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('visitId', visitId)
      formData.append('clinicalNotes', clinicalNotes)
      const res = await fetch('/api/patients/' + patient.id + '/ai-analysis', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
        setAnalysed(true)
        const initialDecisions = {}
        data.suggestions.forEach(function(s, i) {
          initialDecisions[i] = 'pending'
        })
        setDecisions(initialDecisions)
      } else {
        alert('AI analysis failed. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function decide(index, decision) {
    setDecisions(function(prev) {
      return { ...prev, [index]: decision }
    })
  }

  function handleConfirmAll() {
    const confirmed = suggestions.filter(function(s, i) {
      return decisions[i] === 'confirmed'
    })
    if (onFindingsConfirmed) {
      onFindingsConfirmed(confirmed)
    }
  }

  const pendingCount = Object.values(decisions).filter(function(d) { return d === 'pending' }).length
  const confirmedCount = Object.values(decisions).filter(function(d) { return d === 'confirmed' }).length
  const rejectedCount = Object.values(decisions).filter(function(d) { return d === 'rejected' }).length

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-indigo-600 text-xs">✦</span>
          </div>
          <h2 className="text-sm font-medium text-gray-700">AI-assisted findings</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
            Doctor reviews each suggestion
          </span>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">
            Upload intraoral photo or X-ray
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-200 file:text-xs file:font-medium file:text-gray-600 file:bg-gray-50 hover:file:bg-gray-100"
          />
        </div>

        {imagePreview && (
          <div className="mb-4">
            <img
              src={imagePreview}
              alt="Uploaded"
              className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">
            Additional clinical context (optional)
          </label>
          <textarea
            value={clinicalNotes}
            onChange={function(e) { setClinicalNotes(e.target.value) }}
            placeholder="Pain on percussion, sensitivity to cold, swelling since 3 days..."
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <button
          onClick={handleAnalyse}
          disabled={loading || !image}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'Analysing image...' : 'Analyse with AI'}
        </button>
      </div>

      {analysed && suggestions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">No specific findings identified from this image.</p>
          <p className="text-xs text-gray-400 mt-1">Continue with manual chart marking.</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">
                {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} from AI
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {confirmedCount} confirmed · {rejectedCount} rejected · {pendingCount} pending
              </p>
            </div>
            {pendingCount === 0 && confirmedCount > 0 && (
              <button
                onClick={handleConfirmAll}
                className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Add {confirmedCount} to chart →
              </button>
            )}
          </div>

          <div className="space-y-3">
            {suggestions.map(function(suggestion, index) {
              const decision = decisions[index] || 'pending'
              const condColor = CONDITION_COLORS[suggestion.condition] || 'bg-gray-100 border-gray-300 text-gray-600'
              const confColor = CONFIDENCE_COLORS[suggestion.confidence] || 'text-gray-400'

              return (
                <div
                  key={index}
                  className={'rounded-lg border p-3 transition ' + (
                    decision === 'confirmed' ? 'border-green-300 bg-green-50' :
                    decision === 'rejected' ? 'border-gray-200 bg-gray-50 opacity-50' :
                    'border-gray-200 bg-white'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' + condColor}>
                          Tooth {suggestion.tooth}
                        </span>
                        <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' + condColor}>
                          {suggestion.condition}
                        </span>
                        <span className={'text-xs font-medium ' + confColor}>
                          {suggestion.confidence} confidence
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{suggestion.reasoning}</p>
                    </div>

                    {decision === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={function() { decide(index, 'confirmed') }}
                          className="w-7 h-7 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition text-sm flex items-center justify-center"
                        >
                          ✓
                        </button>
                        <button
                          onClick={function() { decide(index, 'rejected') }}
                          className="w-7 h-7 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition text-sm flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {decision === 'confirmed' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-green-600 font-medium">Confirmed</span>
                        <button
                          onClick={function() { decide(index, 'pending') }}
                          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                        >
                          undo
                        </button>
                      </div>
                    )}

                    {decision === 'rejected' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400 font-medium">Rejected</span>
                        <button
                          onClick={function() { decide(index, 'pending') }}
                          className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                        >
                          undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {pendingCount > 0 && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Review all suggestions before adding to chart
            </p>
          )}
        </div>
      )}
    </div>
  )
}