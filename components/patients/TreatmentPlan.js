'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const URGENCY_COLORS = {
  URGENT: 'bg-red-50 border-red-300 text-red-700',
  SOON: 'bg-amber-50 border-amber-300 text-amber-700',
  PLANNED: 'bg-blue-50 border-blue-300 text-blue-700',
  MONITOR: 'bg-slate-100 border-slate-300 text-slate-600',
}

const URGENCY_LABELS = {
  URGENT: 'Urgent',
  SOON: 'Soon',
  PLANNED: 'Planned',
  MONITOR: 'Monitor',
}

const SERVICES = [
  'Free Dental Check-Up & X-Ray',
  'Scaling & Polishing',
  'Root Canal Treatment (RCT)',
  'Tooth Extraction',
  'Composite Filling',
  'Crown / Cap Placement',
  'Dental Implant',
  'Teeth Whitening',
  'Braces / Orthodontic',
  'Consultation',
  'Other',
]

export default function TreatmentPlan({ patient, visitId, findings, medicalHistory, existing, nextUrl }) {
  const router = useRouter()
  const [items, setItems] = useState(existing?.treatmentItems || [])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existing?.treatmentItems?.length)
  const [newItem, setNewItem] = useState({
    procedureName: '',
    toothRef: '',
    urgency: 'PLANNED',
    estimatedCost: '',
    estimatedSessions: '1',
  })

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          action: 'generate',
          findings: findings?.toothFindings || {},
          clinicalNotes: findings?.clinicalNotes || '',
          medicalHistory: {
            chiefComplaint: medicalHistory?.chiefComplaint || '',
            conditions: medicalHistory?.conditions || [],
            medications: medicalHistory?.medications || [],
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setItems(function(prev) {
          // Merge AI suggestions with existing items, avoid duplicates
          const existing = [...prev]
          const newOnes = (data.items || []).filter(function(ai) {
            return !existing.some(function(e) {
              return e.procedureName === ai.procedureName && e.toothRef === ai.toothRef
            })
          })
          return [...existing, ...newOnes]
        })
        setSaved(false)
      } else {
        alert('Failed to generate suggestions. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (items.length === 0) {
      alert('Please add at least one procedure')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/patients/' + patient.id + '/treatment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          action: 'save',
          items,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.plan?.treatmentItems) {
          setItems(data.plan.treatmentItems)
        }
        setSaved(true)
      } else {
        alert('Failed to save treatment plan. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function updateItem(index, field, value) {
    setItems(function(prev) {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    setSaved(false)
  }

  function removeItem(index) {
    setItems(function(prev) {
      return prev.filter(function(_, i) { return i !== index })
    })
    setSaved(false)
  }

  function addItem() {
    if (!newItem.procedureName.trim()) {
      alert('Please enter a procedure name')
      return
    }
    setItems(function(prev) {
      return [...prev, {
        procedureName: newItem.procedureName,
        toothRef: newItem.toothRef,
        urgency: newItem.urgency,
        estimatedCost: parseFloat(newItem.estimatedCost) || 0,
        estimatedSessions: parseInt(newItem.estimatedSessions) || 1,
        consentStatus: 'PENDING',
      }]
    })
    setNewItem({
      procedureName: '',
      toothRef: '',
      urgency: 'PLANNED',
      estimatedCost: '',
      estimatedSessions: '1',
    })
    setSaved(false)
  }

  const totalCost = items.reduce(function(sum, item) {
    return sum + (parseFloat(item.estimatedCost) || 0)
  }, 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-slate-900">Treatment plan</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Add procedures manually or use AI to suggest based on findings
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 border border-primary-700 text-primary-700 px-4 py-2 rounded-lg text-sm hover:bg-primary-50 transition disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {generating ? 'Generating...' : 'Suggest with AI'}
        </button>
      </div>

      {/* Add procedure form — always visible */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-slate-700 mb-4">Add procedure</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Procedure
            </div>
            <div className="flex gap-2">
              <select
                value={newItem.procedureName}
                onChange={function(e) {
                  setNewItem(function(p) { return { ...p, procedureName: e.target.value } })
                }}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              >
                <option value="">Select procedure...</option>
                {SERVICES.map(function(s) {
                  return <option key={s} value={s}>{s}</option>
                })}
              </select>
              <input
                type="text"
                placeholder="Or type custom..."
                value={SERVICES.includes(newItem.procedureName) ? '' : newItem.procedureName}
                onChange={function(e) {
                  setNewItem(function(p) { return { ...p, procedureName: e.target.value } })
                }}
                className="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Tooth / area
            </div>
            <input
              type="text"
              placeholder="e.g. 46, upper right"
              value={newItem.toothRef}
              onChange={function(e) {
                setNewItem(function(p) { return { ...p, toothRef: e.target.value } })
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Urgency
            </div>
            <select
              value={newItem.urgency}
              onChange={function(e) {
                setNewItem(function(p) { return { ...p, urgency: e.target.value } })
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="URGENT">Urgent</option>
              <option value="SOON">Soon</option>
              <option value="PLANNED">Planned</option>
              <option value="MONITOR">Monitor</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Estimated cost (₹)
            </div>
            <input
              type="number"
              placeholder="0"
              value={newItem.estimatedCost}
              onChange={function(e) {
                setNewItem(function(p) { return { ...p, estimatedCost: e.target.value } })
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Sittings needed
            </div>
            <input
              type="number"
              placeholder="1"
              value={newItem.estimatedSessions}
              onChange={function(e) {
                setNewItem(function(p) { return { ...p, estimatedSessions: e.target.value } })
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
        </div>

        <button
          onClick={addItem}
          className="w-full border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50 transition"
        >
          + Add to plan
        </button>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-700">
              {items.length} procedure{items.length > 1 ? 's' : ''} in plan
            </h3>
            <div className="text-sm font-medium text-primary-700">
              Total: ₹{totalCost.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="space-y-2">
            {items.map(function(item, index) {
              const urgencyColor = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.PLANNED
              return (
                <div key={index} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' + urgencyColor}>
                          {URGENCY_LABELS[item.urgency]}
                        </span>
                        {item.toothRef && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Tooth {item.toothRef}
                          </span>
                        )}
                        {item.consentStatus === 'SIGNED' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                            Consented
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={item.procedureName}
                        onChange={function(e) { updateItem(index, 'procedureName', e.target.value) }}
                        className="w-full text-sm font-medium text-slate-900 border-none outline-none bg-transparent mb-1"
                      />
                      <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
                        <span>₹{parseFloat(item.estimatedCost || 0).toLocaleString('en-IN')}</span>
                        <span>·</span>
                        <span>{item.estimatedSessions} sitting{item.estimatedSessions > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {!saved && (
                      <button
                        onClick={function() { removeItem(index) }}
                        className="text-xs text-slate-300 hover:text-red-400 transition flex-shrink-0 mt-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Save / proceed */}
      {items.length > 0 && (
        <div className="space-y-3">
          {!saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-800 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save treatment plan'}
            </button>
          )}

          {saved && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">Treatment plan saved</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {items.length} procedure{items.length > 1 ? 's' : ''} · ₹{totalCost.toLocaleString('en-IN')} total
                  </p>
                </div>
                <button
                  onClick={function() { setSaved(false) }}
                  className="ml-auto text-xs text-green-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <button
                onClick={function() {
                  router.push(nextUrl || '/dashboard/patients/' + patient.id + '/record')
                }}
                className="w-full bg-primary-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-primary-800 transition"
              >
                Proceed to consent →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}