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
      const res = await fetch('/api/patients/' + patient.id + '/exam-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, signatureData }),
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Examination consent signed</p>
            <p className="text-xs text-gray-400 mt-0.5">Patient has consented to examination and imaging</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-800">Examination consent</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 ml-auto">
          Required before examination
        </span>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-600 leading-relaxed">
        I, <strong className="text-gray-800">{patient.name}</strong>, consent to a clinical
        dental examination including visual inspection, probing, and diagnostic imaging
        (photographs and X-rays) as deemed necessary by the treating dentist. I understand
        this is an examination only and no treatment will be performed without my separate
        written consent.
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600">Patient signature</label>
          <button
            onClick={clearSignature}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={500}
          height={120}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-white cursor-crosshair touch-none hover:border-indigo-200 transition"
          style={{ height: '120px' }}
        />
        {!signed && (
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            Sign above using mouse or finger on tablet
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || (!signed && !existing)}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
      >
        {loading ? 'Saving...' : 'Confirm consent and proceed to examination'}
      </button>
    </div>
  )
}