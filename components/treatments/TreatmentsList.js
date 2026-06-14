'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_TONE = {
  PLANNED: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-800 border-amber-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

const STATUS_LABEL = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const IST = 'Asia/Kolkata'
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: IST,
  })
}

function formatINR(n) {
  return '₹' + (Math.round(n) || 0).toLocaleString('en-IN')
}

export default function TreatmentsList({ initialRows, initialStatus, initialQuery }) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus || 'ACTIVE')
  const [q, setQ] = useState(initialQuery || '')

  // Client-side filter for instant feedback when typing in search.
  // (Initial rows already filtered by server-side query.)
  const visible = useMemo(function() {
    if (!q.trim()) return initialRows
    const needle = q.toLowerCase()
    return initialRows.filter(function(r) {
      return (
        (r.type || '').toLowerCase().includes(needle) ||
        (r.area || '').toLowerCase().includes(needle) ||
        (r.patient?.name || '').toLowerCase().includes(needle) ||
        (r.patient?.originalID || '').toLowerCase().includes(needle)
      )
    })
  }, [initialRows, q])

  function applyFilters(newStatus, newQuery) {
    const sp = new URLSearchParams()
    if (newStatus && newStatus !== 'ACTIVE') sp.set('status', newStatus)
    if (newQuery) sp.set('q', newQuery)
    router.push('/dashboard/treatments' + (sp.toString() ? '?' + sp.toString() : ''))
  }

  function onStatusChange(s) {
    setStatus(s)
    applyFilters(s, q)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'IN_PROGRESS', label: 'In progress' },
            { value: 'PLANNED', label: 'Planned' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'ALL', label: 'All' },
          ].map(function(opt) {
            const selected = status === opt.value
            return (
              <button
                key={opt.value}
                onClick={function() { onStatusChange(opt.value) }}
                className={
                  'text-xs px-3 py-1.5 rounded-full border transition ' +
                  (selected ? 'border-indigo-500 bg-indigo-50 text-indigo-800 font-medium' : 'border-slate-200 text-slate-600 hover:bg-slate-50')
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <input
          type="text"
          value={q}
          onChange={function(e) { setQ(e.target.value) }}
          onKeyDown={function(e) { if (e.key === 'Enter') applyFilters(status, q) }}
          placeholder="Search patient name, ORK ID, or treatment…"
          className="text-sm h-9 border border-slate-200 rounded-lg px-3 w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No treatments match.</p>
            <p className="text-xs text-slate-400 mt-1">Try a different filter or clear the search.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Treatment</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Sittings</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Balance</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(function(r) {
                const expected = r.expectedSittings ? '~' + r.expectedSittings : '—'
                return (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer">
                    <td className="py-3 px-4" onClick={function() { router.push('/dashboard/treatments/' + r.id) }}>
                      <div className="text-sm font-medium text-slate-900">{r.patient?.name}</div>
                      <div className="text-xs text-slate-400">{r.patient?.originalID}</div>
                    </td>
                    <td className="py-3 px-4" onClick={function() { router.push('/dashboard/treatments/' + r.id) }}>
                      <div className="text-sm text-slate-700">{r.type}{r.area ? ' ' + r.area : ''}</div>
                      <div className="text-xs text-slate-400">{r.startedAt ? 'started ' + formatDate(r.startedAt) : 'not started'}</div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 text-center" onClick={function() { router.push('/dashboard/treatments/' + r.id) }}>
                      {r.sittingsCount} of {expected}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={function() { router.push('/dashboard/treatments/' + r.id) }}>
                      {r.balance > 0
                        ? <span className="text-sm font-medium text-red-700">{formatINR(r.balance)}</span>
                        : <span className="text-sm text-slate-400">{formatINR(0)}</span>
                      }
                    </td>
                    <td className="py-3 px-4" onClick={function() { router.push('/dashboard/treatments/' + r.id) }}>
                      <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium border ' + (STATUS_TONE[r.status] || STATUS_TONE.PLANNED)}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === 'IN_PROGRESS' || r.status === 'PLANNED' ? (
                        <Link
                          href={'/dashboard/treatments/' + r.id + '/sitting'}
                          onClick={function(e) { e.stopPropagation() }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-indigo-500 text-indigo-700 hover:bg-indigo-50 inline-block whitespace-nowrap"
                        >
                          + Sitting
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">
        Click any row to see treatment details, past sittings, and actions. Use &quot;+ Sitting&quot; to record a return visit without going through history/examination again.
      </p>
    </div>
  )
}
