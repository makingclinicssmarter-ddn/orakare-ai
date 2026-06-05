'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamConsent({ patient, visitId, existing }) {
  const router = useRouter()
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [signed, setSigned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(!!existing)

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
    if (!signed && !existing) {
      alert('Please sign before proceeding')
      return
    }

    setLoading(true)

    try {
      const canvas = canvasRef.current
      const signatureData = signed ? canvas.toDataURL('image/png') : null

      const res = await fetch(`/api/patients/${patient.id}/exam-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId,
          signatureData,
        }),
      })

      if (res.ok) {
        setSaved(true)
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

  if (saved) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-sm">✓</span>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">Examination consent signed</div>
            <div className="text-xs text-gray-400">Patient has consented to examination</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-medium text-gray-700 mb-1">Examination consent</h2>
      <p className="text-xs text-gray-400 mb-4">Patient must sign before examination begins</p>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-600 leading-relaxed">
        I, <strong>{patient.name}</strong>, consent to a clinical dental examination
        including visual inspection, probing, and diagnostic imaging (photographs and
        X-rays) as deemed necessary by the treating dentist. I understand this is an
        examination only and no treatment will be performed without my separate consent.
      </div>

      <div className="mb-3">
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
          height={120}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full border border-gray-200 rounded-lg bg-white cursor-crosshair touch-none"
          style={{ height: '120px' }}
        />
        {!signed && (
          <p className="text-xs text-gray-400 mt-1">Sign above using mouse or finger</p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || (!signed && !existing)}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Confirm consent & proceed to examination'}
      </button>
    </div>
  )
}