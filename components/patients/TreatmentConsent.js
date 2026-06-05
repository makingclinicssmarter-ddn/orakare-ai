'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function TreatmentConsent({ patient, visitId, items, onConsentComplete }) {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [signed, setSigned] = useState(false)
  const [physicalForm, setPhysicalForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  const signableItems = items.filter(function(i) {
    return i.consentStatus === 'PENDING'
  })

  const totalCost = signableItems.reduce(function(sum, item) {
    return sum + (parseFloat(item.estimatedCost) || 0)
  }, 0)

  function startDrawing(e) {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#1e1e1e'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    setDrawing(true)
    setSigned(true)
  }

  function draw(e) {
    if (!drawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing() {
    setDrawing(false)
  }

  function clearSignature() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSigned(false)
  }

  async function handleSubmit() {
    if (!signed && !physicalForm) {
      alert('Please sign or confirm physical form was signed')
      return
    }

    setLoading(true)

    try {
      const canvas = canvasRef.current
      const signatureData = signed ? canvas.toDataURL('image/png') : null

      const res = await fetch('/api/patients/' + patient.id + '/treatment-consent-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          itemIds: signableItems.map(function(i) { return i.id }),
          signatureData,
          physicalForm,
          status: 'SIGNED',
        }),
      })

      if (res.ok) {
        setShow(false)
        if (onConsentComplete) onConsentComplete()
        router.refresh()
      } else {
        alert('Something went wrong. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (signableItems.length === 0) return null

  return (
    <div>
      <button
        onClick={function() { setShow(true) }}
        className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 transition"
      >
        Get patient consent for {signableItems.length} procedure{signableItems.length > 1 ? 's' : ''} →
      </button>

      {show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-gray-900">Informed treatment consent</h2>
                <button
                  onClick={function() { setShow(false) }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Patient and procedures */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Patient: {patient.name}
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  I consent to the following procedures:
                </p>
                <div className="space-y-2">
                  {signableItems.map(function(item, index) {
                    return (
                      <div key={index} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <div>
                          <p className="text-sm text-gray-800">{item.procedureName}</p>
                          {item.toothRef && (
                            <p className="text-xs text-gray-400">Tooth {item.toothRef}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">
                            ₹{parseFloat(item.estimatedCost || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.estimatedSessions} sitting{item.estimatedSessions > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Total estimate</span>
                  <span className="text-sm font-medium text-indigo-600">
                    ₹{totalCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Consent statement */}
              <div className="text-xs text-gray-500 leading-relaxed mb-4">
                I, <strong>{patient.name}</strong>, understand the nature of the procedures
                listed above, the associated risks and benefits, and the estimated costs.
                I have had the opportunity to ask questions and have them answered to my
                satisfaction. I voluntarily consent to the treatment.
              </div>

              {/* Physical form option */}
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="physical"
                  checked={physicalForm}
                  onChange={function(e) {
                    setPhysicalForm(e.target.checked)
                    if (e.target.checked) clearSignature()
                  }}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="physical" className="text-xs text-gray-600">
                  Patient signed physical consent form (attach to file)
                </label>
              </div>

              {/* Digital signature */}
              {!physicalForm && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">Patient signature</label>
                    <button
                      onClick={clearSignature}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={100}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full border border-gray-200 rounded-lg bg-white cursor-crosshair touch-none"
                    style={{ height: '100px' }}
                  />
                  {!signed && (
                    <p className="text-xs text-gray-400 mt-1">Sign above using mouse or finger</p>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || (!signed && !physicalForm)}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Confirm consent & proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}