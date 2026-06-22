'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConsultantFormModal from './ConsultantFormModal'

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

function SplitLabel({ row }) {
  if (!row.splitType) return <span className="text-xs text-slate-400">—</span>
  if (row.splitType === 'PERCENTAGE') return <span className="text-xs text-slate-700">{row.splitValue}%</span>
  if (row.splitType === 'FIXED') return <span className="text-xs text-slate-700">{formatINR(row.splitValue)} flat</span>
  return null
}

export default function ConsultantsListView() {
  const router = useRouter()
  const [consultants, setConsultants] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (showInactive) params.set('showInactive', 'true')
      const res = await fetch('/api/consultants?' + params.toString())
      if (res.ok) {
        const data = await res.json()
        setConsultants(data.consultants || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(function() {
    const t = setTimeout(load, 200)
    return function() { clearTimeout(t) }
  }, [q, showInactive])

  const totalPending = consultants.reduce(function(s, c) { return s + Number(c.pendingPayoutTotal || 0) }, 0)

  return (
    <div>
      {totalPending > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
          <div className="text-xs font-medium text-amber-700">Total pending payouts</div>
          <div className="text-lg font-semibold text-amber-900 mt-0.5">{formatINR(totalPending)}</div>
          <div className="text-[11px] text-amber-600 mt-1">Across {consultants.filter(function(c) { return c.pendingPayoutTotal > 0 }).length} consultants</div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text" placeholder="Search by name, specialization, phone…"
          value={q} onChange={function(e) { setQ(e.target.value) }}
          className="flex-1 min-w-[200px] h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={showInactive} onChange={function(e) { setShowInactive(e.target.checked) }}
            className="w-3.5 h-3.5 rounded border-slate-300" />
          Show archived
        </label>
        <button onClick={function() { setShowAdd(true) }}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
          + Add consultant
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Consultant</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Specialty</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Default split</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Pending payout</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center text-xs text-slate-400 py-8">Loading…</td></tr>
            ) : consultants.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-xs text-slate-400 py-8">No consultants yet. Click + Add consultant to get started.</td></tr>
            ) : consultants.map(function(c) {
              return (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <Link href={'/dashboard/consultants/' + c.id} className="block">
                      <div className="text-sm font-medium text-slate-900 hover:text-indigo-700">{c.name}</div>
                      {c.phone && <div className="text-xs text-slate-400">{c.phone}</div>}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{c.specialization || '—'}</td>
                  <td className="py-3 px-4"><SplitLabel row={c} /></td>
                  <td className="py-3 px-4 text-right">
                    {c.pendingPayoutTotal > 0 ? (
                      <div>
                        <div className="text-sm font-medium text-amber-700">{formatINR(c.pendingPayoutTotal)}</div>
                        <div className="text-[10px] text-slate-400">{c.pendingFeeCount} entries</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Nothing pending</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <ConsultantFormModal
          onClose={function() { setShowAdd(false) }}
          onSaved={function(c) { setShowAdd(false); router.push('/dashboard/consultants/' + c.id) }}
        />
      )}
    </div>
  )
}
