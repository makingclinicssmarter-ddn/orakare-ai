'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ConsultantFormModal from './ConsultantFormModal'
import RecordPayoutModal from './RecordPayoutModal'

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  } catch (e) { return '—' }
}

export default function ConsultantDetailView({ consultantId }) {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showPayout, setShowPayout] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState(null)

  async function handleBackfill() {
    if (!confirm('Backfill fee entries for past payments? This scans all treatments where ' + (c?.name || 'this consultant') + ' is currently attached and creates fee entries for any payments that pre-date the attachment.')) return
    setBackfilling(true)
    setBackfillMsg(null)
    try {
      const res = await fetch('/api/consultants/' + consultantId + '/backfill', { method: 'POST' })
      const data = await res.json().catch(function() { return {} })
      if (res.ok) {
        if (data.backfilledCount === 0) {
          setBackfillMsg('Nothing to backfill — all past payments are already accounted for.')
        } else {
          setBackfillMsg('Backfilled ' + data.backfilledCount + ' treatment(s). Total accrued: ₹' + Math.round(data.totalAccrued).toLocaleString('en-IN') + '. Refreshing…')
          setTimeout(function() { load(); setBackfillMsg(null) }, 1500)
        }
      } else {
        setBackfillMsg('Failed: ' + (data.error || res.statusText))
      }
    } catch (e) {
      setBackfillMsg('Network error')
    } finally {
      setBackfilling(false)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/consultants/' + consultantId)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }

  useEffect(function() { load() }, [consultantId])

  async function handleArchive() {
    if (!confirm('Archive this consultant? They will be hidden from search but all history is preserved.')) return
    const res = await fetch('/api/consultants/' + consultantId, { method: 'DELETE' })
    if (res.ok) router.push('/dashboard/consultants')
  }

  if (loading) return <div className="text-sm text-slate-400">Loading…</div>
  if (!data) return <div className="text-sm text-red-600">Consultant not found</div>

  const c = data.consultant
  const summary = data.summary || {}
  const pending = c.feeEntries.filter(function(f) { return f.status === 'PENDING' })
  const paid = c.feeEntries.filter(function(f) { return f.status === 'PAID' })

  return (
    <div>
      <div className="mb-1">
        <Link href="/dashboard/consultants" className="text-xs text-slate-500 hover:text-slate-700">← Consultants</Link>
      </div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{c.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {c.specialization || 'Consultant'}{c.phone ? ' · ' + c.phone : ''}
          </p>
          {c.splitType && (
            <p className="text-xs text-slate-400 mt-1">
              Default split: {c.splitType === 'PERCENTAGE' ? c.splitValue + '%' : formatINR(c.splitValue) + ' flat'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleBackfill} disabled={backfilling}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Create fee entries for payments that pre-date the consultant attachment">
            {backfilling ? 'Backfilling…' : 'Backfill past fees'}
          </button>
          <a href={'/api/consultants/' + c.id + '/statement'} target="_blank" rel="noopener noreferrer"
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Print statement
          </a>
          <button onClick={function() { setShowEdit(true) }}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Edit
          </button>
          <button onClick={handleArchive}
            className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
            Archive
          </button>
          {summary.pendingTotal > 0 && (
            <button onClick={function() { setShowPayout(true) }}
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium">
              Record payout
            </button>
          )}
        </div>
      </div>

      {backfillMsg && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
          {backfillMsg}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <div className="text-xs font-medium text-amber-700">Pending payout</div>
          <div className="text-xl font-semibold text-amber-900 mt-0.5">{formatINR(summary.pendingTotal || 0)}</div>
          <div className="text-[11px] text-amber-700 mt-1">{summary.pendingCount || 0} fee entries</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <div className="text-xs font-medium text-green-700">Paid out</div>
          <div className="text-xl font-semibold text-green-900 mt-0.5">{formatINR(summary.paidTotal || 0)}</div>
          <div className="text-[11px] text-green-700 mt-1">{summary.paidCount || 0} fee entries</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <div className="text-xs font-medium text-indigo-700">Lifetime</div>
          <div className="text-xl font-semibold text-indigo-900 mt-0.5">{formatINR(summary.lifetimeTotal || 0)}</div>
          <div className="text-[11px] text-indigo-700 mt-1">Total earned</div>
        </div>
      </div>

      {/* Pending fees */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-medium text-slate-700">Pending fees ({pending.length})</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">Fees accrued from patient payments, not yet paid out to consultant.</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Date</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Patient</th>
              <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Treatment</th>
              <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Collected</th>
              <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Share</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-xs text-slate-400 py-6">No pending fees.</td></tr>
            ) : pending.map(function(f) {
              const t = f.treatment
              const tname = t ? ((t.type || 'Treatment') + (t.area ? ' ' + t.area : '')) : '—'
              return (
                <tr key={f.id} className="border-b border-slate-100">
                  <td className="py-2.5 px-4 text-xs text-slate-600">{formatDate(f.createdAt)}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-700">
                    {t && t.patient ? (
                      <Link href={'/dashboard/patients/' + t.patient.id} className="hover:text-indigo-700">
                        {t.patient.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-700">{tname}</td>
                  <td className="py-2.5 px-4 text-xs text-slate-600 text-right">{formatINR(f.totalCollected)}</td>
                  <td className="py-2.5 px-4 text-sm text-amber-700 font-medium text-right">{formatINR(f.consultantShare)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paid fees */}
      {paid.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-medium text-slate-700">Paid fees ({paid.length})</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Accrued</th>
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Paid</th>
                <th className="text-left py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Patient</th>
                <th className="text-right py-2 px-4 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Share</th>
              </tr>
            </thead>
            <tbody>
              {paid.map(function(f) {
                const t = f.treatment
                return (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2.5 px-4 text-xs text-slate-500">{formatDate(f.createdAt)}</td>
                    <td className="py-2.5 px-4 text-xs text-green-700">{formatDate(f.paidDate)}{f.payMode ? ' · ' + f.payMode : ''}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{(t && t.patient && t.patient.name) || '—'}</td>
                    <td className="py-2.5 px-4 text-sm text-slate-600 text-right">{formatINR(f.consultantShare)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showEdit && (
        <ConsultantFormModal
          consultant={c}
          onClose={function() { setShowEdit(false) }}
          onSaved={function() { setShowEdit(false); load() }}
        />
      )}
      {showPayout && (
        <RecordPayoutModal
          consultant={c}
          pendingTotal={summary.pendingTotal}
          pendingEntries={pending}
          onClose={function() { setShowPayout(false) }}
          onSaved={function() { setShowPayout(false); load() }}
        />
      )}
    </div>
  )
}
