'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TreatmentConsent from './TreatmentConsent'

const URGENCY_COLORS = {
  URGENT: 'bg-red-100 border-red-400 text-red-800',
  SOON: 'bg-amber-100 border-amber-400 text-amber-800',
  PLANNED: 'bg-blue-100 border-blue-400 text-blue-800',
  MONITOR: 'bg-gray-100 border-gray-400 text-gray-600',
}

const URGENCY_LABELS = {
  URGENT: 'Urgent',
  SOON: 'Soon',
  PLANNED: 'Planned',
  MONITOR: 'Monitor',
}

const CONSENT_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600',
  SIGNED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
}

export default function TreatmentPlan({ patient, visitId, findings, medicalHistory, existing, nextUrl }) {
  const router = useRouter()
  const [items, setItems] = useState(existing?.treatmentItems || [])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existing)
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
        setItems(data.items || [])
        setSaved(false)
      } else {
        alert('Failed to generate treatment plan. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
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

  const allConsented = items.length > 0 && items.every(function(item) {
    return item.consentStatus === 'SIGNED' || item.consentStatus === 'DECLINED'
  })

  const hasItems = items.length > 0

  return (
    <div className="space-y-4">

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-700">AI treatment plan</h2>
            <p className="text-xs text-gray-400 mt-0.5">Generated from examination findings and medical history</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate plan'}
          </button>
        </div>
      </div>

      {hasItems && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">Treatment items</h2>
            <div className="text-sm font-medium text-indigo-600">
              Total: ₹{totalCost.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="space-y-3">
            {items.map(function(item, index) {
              const urgencyColor = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.PLANNED
              const consentColor = CONSENT_COLORS[item.consentStatus] || CONSENT_COLORS.PENDING

              return (
                <div key={index} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' + urgencyColor}>
                          {URGENCY_LABELS[item.urgency]}
                        </span>
                        {item.toothRef && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            Tooth {item.toothRef}
                          </span>
                        )}
                        <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + consentColor}>
                          {item.consentStatus === 'SIGNED' ? 'Consent signed' :
                           item.consentStatus === 'DECLINED' ? 'Declined' : 'Consent pending'}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={item.procedureName}
                        onChange={function(e) { updateItem(index, 'procedureName', e.target.value) }}
                        className="w-full text-sm font-medium text-gray-900 border-none outline-none bg-transparent mb-1"
                      />

                      <div className="flex items-center gap-3 flex-wrap">
                        <select
                          value={item.urgency}
                          onChange={function(e) { updateItem(index, 'urgency', e.target.value) }}
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                        >
                          <option value="URGENT">Urgent</option>
                          <option value="SOON">Soon</option>
                          <option value="PLANNED">Planned</option>
                          <option value="MONITOR">Monitor</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">₹</span>
                          <input
                            type="number"
                            value={item.estimatedCost}
                            onChange={function(e) { updateItem(index, 'estimatedCost', e.target.value) }}
                            className="w-24 text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                            placeholder="Cost"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.estimatedSessions}
                            onChange={function(e) { updateItem(index, 'estimatedSessions', e.target.value) }}
                            className="w-12 text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                            placeholder="1"
                          />
                          <span className="text-xs text-gray-400">sittings</span>
                        </div>
                      </div>
                    </div>

                    {(!saved || !item.id) && (
                      <button
                        onClick={function() { removeItem(index) }}
                        className="text-xs text-gray-300 hover:text-red-400 transition flex-shrink-0"
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

      {hasItems && !allConsented && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Add procedure manually</h2>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="text"
              placeholder="Procedure name"
              value={newItem.procedureName}
              onChange={function(e) { setNewItem(function(p) { return { ...p, procedureName: e.target.value } }) }}
              className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Tooth number"
              value={newItem.toothRef}
              onChange={function(e) { setNewItem(function(p) { return { ...p, toothRef: e.target.value } }) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newItem.urgency}
              onChange={function(e) { setNewItem(function(p) { return { ...p, urgency: e.target.value } }) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="URGENT">Urgent</option>
              <option value="SOON">Soon</option>
              <option value="PLANNED">Planned</option>
              <option value="MONITOR">Monitor</option>
            </select>
            <input
              type="number"
              placeholder="Cost"
              value={newItem.estimatedCost}
              onChange={function(e) { setNewItem(function(p) { return { ...p, estimatedCost: e.target.value } }) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="number"
              placeholder="Sittings"
              value={newItem.estimatedSessions}
              onChange={function(e) { setNewItem(function(p) { return { ...p, estimatedSessions: e.target.value } }) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={addItem}
            className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Add procedure
          </button>
        </div>
      )}

      {hasItems && (
        <div className="space-y-3">
          {!saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save and approve treatment plan'}
            </button>
          )}

          {saved && !allConsented && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-800">Informed consent required</p>
                <p className="text-xs text-amber-600 mt-1">Patient must consent before treatment begins.</p>
              </div>
              <TreatmentConsent
                patient={patient}
                visitId={visitId}
                items={items}
                onConsentComplete={function(signedItems) {
                  setItems(function(prev) {
                    return prev.map(function(item) {
                      const match = signedItems.find(function(s) { return s.id === item.id })
                      return match ? { ...item, consentStatus: 'SIGNED' } : item
                    })
                  })
                }}
              />
            </div>
          )}

          {saved && allConsented && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-medium text-green-800">All consents collected</p>
                <p className="text-xs text-green-600 mt-1">Treatment can now proceed. Generate clinical record next.</p>
              </div>
              
                <button
                onClick={function() { router.push(nextUrl || '/dashboard/patients/' + patient.id + '/record') }}
                className="block w-full bg-primary-700 text-white py-3 rounded-xl text-sm font-medium text-center hover:bg-primary-800 transition"
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