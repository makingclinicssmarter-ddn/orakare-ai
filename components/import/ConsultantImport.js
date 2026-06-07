'use client'

import { useState } from 'react'

const COLUMN_MAP = {
  'id': 'id', 'name': 'name', 'specialization': 'specialization',
  'phone': 'phone', 'email': 'email', 'split type': 'splitType',
  'split value': 'splitValue', 'notes': 'notes', 'active': 'active',
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(function(h) { return h.trim().replace(/^"|"$/g, '') })
  return lines.slice(1).map(function(line) {
    const values = []; let current = ''; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes }
      else if (line[i] === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += line[i] }
    }
    values.push(current.trim())
    const row = {}; headers.forEach(function(h, i) { row[h] = values[i] || '' }); return row
  }).filter(function(r) { return r['Name'] || r['name'] })
}

export default function ConsultantImport() {
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file || !file.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = function(evt) { setRows(parseCSV(evt.target.result)); setStep('preview') }
    reader.readAsText(file)
  }

  async function handleImport() {
    setImporting(true)
    try {
      const mapped = rows.map(function(r) {
        const m = {}
        Object.keys(r).forEach(function(k) { const f = COLUMN_MAP[k.toLowerCase().trim()]; if (f) m[f] = r[k] })
        return m
      })
      const res = await fetch('/api/import/consultants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultants: mapped }),
      })
      if (res.ok) { setResults(await res.json()); setStep('done') }
      else { setError('Import failed.') }
    } catch (e) { setError('Network error.') }
    finally { setImporting(false) }
  }

  function reset() { setStep('upload'); setRows([]); setResults(null); setError('') }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Export the Consultants tab from Google Sheets as CSV</p>
      {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3"><p className="text-xs text-red-700">{error}</p></div>}
      {step === 'upload' && (
        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-100 transition">
          <span className="text-sm text-gray-600">Choose CSV file</span>
          <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </label>
      )}
      {step === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">{rows.length} consultants found</p>
            <div className="flex gap-2">
              <button onClick={reset} className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-500">Cancel</button>
              <button onClick={handleImport} disabled={importing} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg disabled:opacity-50 font-medium">
                {importing ? 'Importing...' : 'Import ' + rows.length}
              </button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">{['Name','Specialization','Phone','Split Type','Split Value'].map(function(c) { return <th key={c} className="text-left text-gray-400 font-medium pb-1.5 pr-3">{c}</th> })}</tr></thead>
            <tbody>{rows.slice(0,5).map(function(r,i) { return <tr key={i} className="border-b border-gray-50"><td className="py-1.5 pr-3 text-gray-600">{r['Name']||'—'}</td><td className="py-1.5 pr-3 text-gray-600">{r['Specialization']||'—'}</td><td className="py-1.5 pr-3 text-gray-600">{r['Phone']||'—'}</td><td className="py-1.5 pr-3 text-gray-600">{r['Split Type']||'—'}</td><td className="py-1.5 pr-3 text-gray-600">{r['Split Value']||'—'}</td></tr> })}</tbody>
          </table>
        </div>
      )}
      {step === 'done' && results && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-green-700">{results.imported} imported{results.skipped > 0 && ' · ' + results.skipped + ' skipped'}{results.failed > 0 && ' · ' + results.failed + ' failed'}</p>
          <button onClick={reset} className="text-xs text-green-600 hover:underline">Import more</button>
        </div>
      )}
    </div>
  )
}