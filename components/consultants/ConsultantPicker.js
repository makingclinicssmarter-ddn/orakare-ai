'use client'
import { useState, useEffect } from 'react'

// Used in TreatmentPlan form (during consultation) AND on existing treatment cards
// to attach/edit/detach a consultant.

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

export default function ConsultantPicker({ value, onChange, estimate }) {
  // value: { consultantId, splitType, splitValue } or null
  const [consultants, setConsultants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(function() {
    fetch('/api/consultants').then(function(r) {
      return r.ok ? r.json() : { consultants: [] }
    }).then(function(data) {
      setConsultants(data.consultants || [])
      setLoading(false)
    }).catch(function() { setLoading(false) })
  }, [])

  const selectedId = value?.consultantId || ''
  const selected = consultants.find(function(c) { return c.id === selectedId })
  const splitType = value?.splitType || ''
  const splitValue = value?.splitValue ?? ''

  function selectConsultant(id) {
    if (!id) {
      onChange(null)
      return
    }
    const c = consultants.find(function(x) { return x.id === id })
    if (!c) return
    // Adopt the consultant's defaults
    onChange({
      consultantId: c.id,
      splitType: c.splitType || 'PERCENTAGE',
      splitValue: c.splitValue ?? 0,
    })
  }

  function updateSplit(field, v) {
    onChange({
      consultantId: selectedId,
      splitType: field === 'splitType' ? v : splitType,
      splitValue: field === 'splitValue' ? v : splitValue,
    })
  }

  // Live preview of the share at full estimate
  const previewShare = (function() {
    const est = Number(estimate) || 0
    const sv = Number(splitValue) || 0
    if (!splitType || sv <= 0) return 0
    if (splitType === 'PERCENTAGE') return est * (sv / 100)
    return sv
  })()

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Consultant (optional)</label>
      <select
        value={selectedId}
        onChange={function(e) { selectConsultant(e.target.value) }}
        disabled={loading}
        className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">— No consultant —</option>
        {consultants.map(function(c) {
          return <option key={c.id} value={c.id}>{c.name}{c.specialization ? ' · ' + c.specialization : ''}</option>
        })}
      </select>

      {selectedId && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">Split type</label>
            <select value={splitType}
              onChange={function(e) { updateSplit('splitType', e.target.value) }}
              className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="PERCENTAGE">% of treatment</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">
              Value {splitType === 'PERCENTAGE' ? '(%)' : '(₹)'}
            </label>
            <input type="number" min={0} value={splitValue}
              onChange={function(e) { updateSplit('splitValue', e.target.value === '' ? '' : Number(e.target.value)) }}
              className="w-full h-9 border border-slate-200 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          {previewShare > 0 && (
            <div className="col-span-2 text-[11px] text-slate-500 mt-0.5">
              Consultant's share if fully collected: <span className="font-medium text-slate-700">{formatINR(previewShare)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
