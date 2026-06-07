'use client'

import { useState } from 'react'

const COLUMN_MAPS = {
  sittings: {
    'id': 'id',
    'treatment id': 'treatmentId',
    'patient id': 'patientId',
    'patient name': 'patientName',
    'date': 'date',
    'time': 'time',
    'done': 'done',
    'prescription': 'prescription',
    'notes': 'notes',
    'consumables total': 'consumablesTotal',
    'paid': 'paid',
    'pay mode': 'payMode',
  },
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(function(h) {
    return h.trim().replace(/^"|"$/g, '')
  })
  const rows = lines.slice(1).map(function(line) {
    const values = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes }
      else if (line[i] === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else { current += line[i] }
    }
    values.push(current.trim())
    const row = {}
    headers.forEach(function(h, i) { row[h] = values[i] || '' })
    return row
  }).filter(function(row) { return Object.values(row).some(function(v) { return v }) })
  return { headers, rows }
}

function mapRow(row, columnMap) {
  const mapped = {}
  Object.keys(row).forEach(function(key) {
    const field = columnMap[key.toLowerCase().trim()]
    if (field) mapped[field] = row[key]
  })
  return mapped
}

export default function SittingImport() {
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return }
    setError('')
    const reader = new FileReader()
    reader.onload = function(evt) {
      const parsed = parseCSV(evt.target.result)
      setRows(parsed.rows)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setImporting(true)
    try {
      const mapped = rows.map(function(r) { return mapRow(r, COLUMN_MAPS.sittings) })
      const res = await fetch('/api/import/sittings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sittings: mapped }),
      })
      if (res.ok) {
        setResults(await res.json())
        setStep('done')
      } else {
        setError('Import failed. Please try again.')
      }
    } catch (e) {
      setError('Network error.')
    } finally {
      setImporting(false)
    }
  }

  function reset() { setStep('upload'); setRows([]); setResults(null); setError('') }

  return (
    <ImportShell
      title="Import sittings"
      instruction="Export the Sittings tab from Google Sheets as CSV"
      rows={rows}
      step={step}
      error={error}
      importing={importing}
      results={results}
      onFile={handleFile}
      onImport={handleImport}
      onReset={reset}
      previewCols={['Treatment ID', 'Patient Name', 'Date', 'Done', 'Paid']}
      resultKey="sittings"
    />
  )
}

function ImportShell({ title, instruction, rows, step, error, importing, results, onFile, onImport, onReset, previewCols, resultKey }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{instruction}</p>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {step === 'upload' && (
        <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-100 transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="text-sm text-gray-600">Choose CSV file</span>
          <input type="file" accept=".csv" onChange={onFile} className="hidden" />
        </label>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">{rows.length} rows found</p>
            <div className="flex gap-2">
              <button onClick={onReset} className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Cancel</button>
              <button
                onClick={onImport}
                disabled={importing}
                className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {importing ? 'Importing...' : 'Import ' + rows.length}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {previewCols.map(function(col) {
                    return <th key={col} className="text-left text-gray-400 font-medium pb-1.5 pr-3">{col}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map(function(row, i) {
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      {previewCols.map(function(col) {
                        return <td key={col} className="py-1.5 pr-3 text-gray-600">{row[col] || '—'}</td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'done' && results && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-green-700">
            {results.imported} imported
            {results.skipped > 0 && ' · ' + results.skipped + ' skipped'}
            {results.failed > 0 && ' · ' + results.failed + ' failed'}
          </p>
          <button onClick={onReset} className="text-xs text-green-600 hover:underline">Import more</button>
        </div>
      )}
    </div>
  )
}