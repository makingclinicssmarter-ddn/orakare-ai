'use client'

import { useState } from 'react'
import Link from 'next/link'

const TREATMENT_COLUMN_MAP = {
  'id': 'id',
  'patient id': 'patientId',
  'patient name': 'patientName',
  'type': 'type',
  'area': 'area',
  'notes': 'notes',
  'estimate': 'estimate',
  'discount': 'discount',
  'expected sittings': 'expectedSittings',
  'status': 'status',
  'started at': 'startedAt',
  'completed at': 'completedAt',
  'consultant id': 'consultantId',
  'consultant name': 'consultantName',
  'split type': 'splitType',
  'split value': 'splitValue',
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
      if (line[i] === '"') {
        inQuotes = !inQuotes
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += line[i]
      }
    }
    values.push(current.trim())
    const row = {}
    headers.forEach(function(h, i) {
      row[h] = values[i] || ''
    })
    return row
  }).filter(function(row) {
    return row['Patient ID'] || row['Patient Name'] || row['Type']
  })

  return { headers, rows }
}

function mapRow(row) {
  const mapped = {}
  Object.keys(row).forEach(function(key) {
    const normalised = key.toLowerCase().trim()
    const field = TREATMENT_COLUMN_MAP[normalised]
    if (field) mapped[field] = row[key]
  })
  return mapped
}

export default function TreatmentImport() {
  const [step, setStep] = useState('upload')
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.')
      return
    }
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
      const mapped = rows.map(mapRow).filter(function(r) {
        return r.patientId || r.patientName
      })

      const res = await fetch('/api/import/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatments: mapped }),
      })

      if (res.ok) {
        const data = await res.json()
        setResults(data)
        setStep('done')
      } else {
        setError('Import failed. Please try again.')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep('upload')
    setRows([])
    setResults(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Before importing treatments</h3>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
          <li>Open your Google Sheet</li>
          <li>Go to the <strong>Treatments</strong> tab</li>
          <li>Click File → Download → Comma Separated Values (.csv)</li>
          <li>Upload that CSV file below</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          Patients must be imported first. Treatments are matched by Patient ID.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {step === 'upload' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">Upload Treatments CSV</p>
            <p className="text-xs text-gray-400 mb-4">Exported from Google Sheets Treatments tab</p>
            <label className="cursor-pointer bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              Choose CSV file
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-800">Preview</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {rows.length} treatments found
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="text-xs px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                >
                  {importing ? 'Importing...' : 'Import ' + rows.length + ' treatments'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Patient ID', 'Patient Name', 'Type', 'Area', 'Estimate', 'Status'].map(function(col) {
                      return (
                        <th key={col} className="text-left text-gray-400 font-medium pb-2 pr-4">
                          {col}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map(function(row, index) {
                    return (
                      <tr key={index} className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-gray-500">{row['Patient ID'] || '—'}</td>
                        <td className="py-2 pr-4 text-gray-700 font-medium">{row['Patient Name'] || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{row['Type'] || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{row['Area'] || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{row['Estimate'] ? '₹' + row['Estimate'] : '—'}</td>
                        <td className="py-2 pr-4">
                          <span className={'text-xs px-2 py-0.5 rounded-full ' +
                            (String(row['Status'] || '').toLowerCase() === 'complete' ||
                             row['Status'] === '2'
                              ? 'bg-gray-100 text-gray-500'
                              : 'bg-indigo-50 text-indigo-700')
                          }>
                            {String(row['Status'] || '').toLowerCase() === 'complete' ? 'Complete' : 'Ongoing'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {rows.length > 8 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  ...and {rows.length - 8} more treatments
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'done' && results && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">Import complete</h3>
          <p className="text-sm text-gray-500 mb-4">
            {results.imported} treatments imported
            {results.skipped > 0 && ' · ' + results.skipped + ' skipped (patient not found)'}
            {results.failed > 0 && ' · ' + results.failed + ' failed'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/sittings"
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
            >
              Go to sittings
            </Link>
            <button
              onClick={reset}
              className="text-sm px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
            >
              Import more
            </button>
          </div>
        </div>
      )}
    </div>
  )
}