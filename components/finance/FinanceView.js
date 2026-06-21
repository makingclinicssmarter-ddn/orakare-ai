'use client'
import { useState, useEffect } from 'react'

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
    })
  } catch (e) { return '—' }
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function toYMD(d) {
  const tz = 'Asia/Kolkata'
  return d.toLocaleDateString('en-CA', { timeZone: tz })  // YYYY-MM-DD
}

export default function FinanceView() {
  const now = new Date()
  const [from, setFrom] = useState(toYMD(startOfMonth(now)))
  const [to, setTo] = useState(toYMD(endOfMonth(now)))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/finance/summary?from=' + from + '&to=' + to)
      if (!res.ok) {
        const d = await res.json().catch(function() { return {} })
        setError(d.error || res.statusText)
        setLoading(false)
        return
      }
      setData(await res.json())
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(function() { load() }, [])

  function applyPreset(preset) {
    const n = new Date()
    if (preset === 'this_month') {
      setFrom(toYMD(startOfMonth(n)))
      setTo(toYMD(endOfMonth(n)))
    } else if (preset === 'last_month') {
      const lm = new Date(n.getFullYear(), n.getMonth() - 1, 1)
      setFrom(toYMD(startOfMonth(lm)))
      setTo(toYMD(endOfMonth(lm)))
    } else if (preset === 'last_30') {
      const start = new Date(n.getTime() - 30 * 24 * 60 * 60 * 1000)
      setFrom(toYMD(start))
      setTo(toYMD(n))
    } else if (preset === 'last_90') {
      const start = new Date(n.getTime() - 90 * 24 * 60 * 60 * 1000)
      setFrom(toYMD(start))
      setTo(toYMD(n))
    } else if (preset === 'this_year') {
      setFrom(toYMD(new Date(n.getFullYear(), 0, 1)))
      setTo(toYMD(n))
    }
  }

  return (
    <div>
      {/* Date range controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">From</label>
            <input type="date" value={from} onChange={function(e) { setFrom(e.target.value) }}
              className="h-9 border border-slate-200 rounded-lg px-2 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">To</label>
            <input type="date" value={to} onChange={function(e) { setTo(e.target.value) }}
              className="h-9 border border-slate-200 rounded-lg px-2 text-sm" />
          </div>
          <button onClick={load} disabled={loading}
            className="text-xs px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <div className="text-xs text-slate-400 ml-2">Quick:</div>
          {['this_month', 'last_month', 'last_30', 'last_90', 'this_year'].map(function(p) {
            return (
              <button key={p} onClick={function() { applyPreset(p) }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                {p.replace(/_/g, ' ')}
              </button>
            )
          })}
        </div>
        {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
      </div>

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="text-xs font-medium text-green-700">Revenue</div>
              <div className="text-2xl font-semibold text-green-900 mt-0.5">{formatINR(data.summary.revenue)}</div>
              <div className="text-xs text-green-700 mt-1">{data.summary.receiptCount} receipts</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="text-xs font-medium text-red-700">Expenses</div>
              <div className="text-2xl font-semibold text-red-900 mt-0.5">{formatINR(data.summary.expenses)}</div>
              <div className="text-xs text-red-700 mt-1">{data.summary.expenseCount} entries</div>
            </div>
            <div className={'rounded-xl p-4 border ' + (data.summary.net >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100')}>
              <div className={'text-xs font-medium ' + (data.summary.net >= 0 ? 'text-indigo-700' : 'text-amber-700')}>Net</div>
              <div className={'text-2xl font-semibold mt-0.5 ' + (data.summary.net >= 0 ? 'text-indigo-900' : 'text-amber-900')}>
                {formatINR(data.summary.net)}
              </div>
              <div className={'text-xs mt-1 ' + (data.summary.net >= 0 ? 'text-indigo-700' : 'text-amber-700')}>
                Revenue − Expenses
              </div>
            </div>
          </div>

          {/* Expense breakdown by category */}
          {Object.keys(data.expByCategory).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <h2 className="text-sm font-medium text-slate-700 mb-3">Expenses by category</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.expByCategory)
                    .sort(function(a, b) { return b[1] - a[1] })
                    .map(function(e) {
                      return (
                        <tr key={e[0]} className="border-b border-slate-50">
                          <td className="py-2 text-sm text-slate-700">{e[0]}</td>
                          <td className="py-2 text-sm text-slate-900 text-right font-medium">{formatINR(e[1])}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed lists side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-slate-700 mb-2">Receipts</h2>
              {data.receipts.length === 0 ? (
                <p className="text-xs text-slate-400">No receipts in this range.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 sticky top-0 bg-white">
                        <th className="text-left py-2 text-[10px] font-medium text-slate-500 uppercase">Date</th>
                        <th className="text-left py-2 text-[10px] font-medium text-slate-500 uppercase">Mode</th>
                        <th className="text-right py-2 text-[10px] font-medium text-slate-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.receipts.map(function(r) {
                        return (
                          <tr key={r.id} className="border-b border-slate-50">
                            <td className="py-2 text-xs text-slate-600">{formatDate(r.date)}</td>
                            <td className="py-2 text-xs text-slate-600">{r.paymentMode || '—'}</td>
                            <td className="py-2 text-xs text-slate-900 text-right font-medium">{formatINR(r.amount)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h2 className="text-sm font-medium text-slate-700 mb-2">Expenses</h2>
              {data.expenses.length === 0 ? (
                <p className="text-xs text-slate-400">No expenses in this range.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 sticky top-0 bg-white">
                        <th className="text-left py-2 text-[10px] font-medium text-slate-500 uppercase">Date</th>
                        <th className="text-left py-2 text-[10px] font-medium text-slate-500 uppercase">Category</th>
                        <th className="text-right py-2 text-[10px] font-medium text-slate-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenses.map(function(e) {
                        return (
                          <tr key={e.id} className="border-b border-slate-50">
                            <td className="py-2 text-xs text-slate-600">{formatDate(e.date)}</td>
                            <td className="py-2 text-xs text-slate-600">{e.category || '—'}</td>
                            <td className="py-2 text-xs text-slate-900 text-right font-medium">{formatINR(e.amount)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
