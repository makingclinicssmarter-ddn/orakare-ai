'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MarkCompleteButton from './MarkCompleteButton'
import SittingCorrectionButton from './SittingCorrectionButton'

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

export default function TreatmentDetailView({ treatment, sittings, totalPaid, estimate, balance }) {
  const router = useRouter()
  const isActive = treatment.status === 'PLANNED' || treatment.status === 'IN_PROGRESS'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-medium text-slate-900">{treatment.type}{treatment.area ? ' ' + treatment.area : ''}</h1>
              <span className={'text-xs px-2 py-0.5 rounded-full font-medium border ' + (STATUS_TONE[treatment.status] || STATUS_TONE.PLANNED)}>
                {STATUS_LABEL[treatment.status]}
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-1">
              <Link href={'/dashboard/patients/' + treatment.patient.id} className="hover:text-slate-700 underline-offset-2 hover:underline">
                {treatment.patient.name}
              </Link>
              <span> · {treatment.patient.age}y · {treatment.patient.gender} · {treatment.patient.originalID}</span>
            </div>
            {treatment.startedAt && (
              <div className="text-xs text-slate-400 mt-1">
                Started {formatDate(treatment.startedAt)}
                {treatment.completedAt && <span> · completed {formatDate(treatment.completedAt)}</span>}
                {treatment.consultant && <span> · with {treatment.consultant.name}</span>}
              </div>
            )}
          </div>

          {isActive && (
            <div className="flex items-center gap-2">
              <Link
                href={'/dashboard/treatments/' + treatment.id + '/sitting'}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
              >
                + Sitting
              </Link>
              <MarkCompleteButton treatmentId={treatment.id} />
            </div>
          )}
        </div>

        {/* Financial */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Estimate</div>
            <div className="text-lg font-medium text-slate-900 mt-0.5">{formatINR(estimate)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500">Paid</div>
            <div className="text-lg font-medium text-green-700 mt-0.5">{formatINR(totalPaid)}</div>
          </div>
          <div className={'rounded-lg p-3 ' + (balance > 0 ? 'bg-red-50' : 'bg-slate-50')}>
            <div className={'text-xs ' + (balance > 0 ? 'text-red-700' : 'text-slate-500')}>Balance</div>
            <div className={'text-lg font-medium mt-0.5 ' + (balance > 0 ? 'text-red-700' : 'text-slate-900')}>{formatINR(balance)}</div>
          </div>
        </div>

        {treatment.notes && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">{treatment.notes}</div>
          </div>
        )}
      </div>

      {/* Sittings */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-700">Sittings</h2>
          <div className="text-xs text-slate-400">
            {sittings.length} recorded
            {treatment.expectedSittings ? ' · ~' + treatment.expectedSittings + ' expected' : ''}
          </div>
        </div>
        {sittings.length === 0 ? (
          <p className="text-sm text-slate-400">No sittings recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {sittings.map(function(s, idx) {
              const sittingNumber = sittings.length - idx
              const corrections = Array.isArray(s.corrections) ? s.corrections : []
              return (
                <div key={s.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Sitting {sittingNumber}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{formatDate(s.date)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.paid > 0 && (
                        <div className="text-xs text-slate-400">
                          Historical: <span className="text-green-700">{formatINR(s.paid)} {s.payMode || ''}</span>
                        </div>
                      )}
                      <SittingCorrectionButton sittingId={s.id} />
                    </div>
                  </div>
                  {s.description && (
                    <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{s.description}</div>
                  )}
                  {s.notes && (
                    <div className="text-xs text-slate-500 mt-1.5 whitespace-pre-wrap">{s.notes}</div>
                  )}

                  {/* Push #5: Appended correction notes */}
                  {corrections.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-2">
                      <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                        Corrections ({corrections.length})
                      </div>
                      {corrections.map(function(c, i) {
                        return (
                          <div key={i} className="bg-amber-50/40 border border-amber-100 rounded-md px-2.5 py-1.5">
                            <div className="text-[10px] text-amber-700 font-medium">
                              Added {formatDate(c.addedAt)}
                            </div>
                            <div className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap">{c.note}</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Payments / allocations */}
      {treatment.allocations && treatment.allocations.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-3">Payments allocated</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 text-xs font-medium text-slate-500">Date</th>
                <th className="text-left py-2 text-xs font-medium text-slate-500">Mode</th>
                <th className="text-right py-2 text-xs font-medium text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {treatment.allocations.map(function(a) {
                return (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-slate-700">{a.receipt ? formatDate(a.receipt.date) : '—'}</td>
                    <td className="py-2 text-slate-600">{a.receipt?.paymentMode || '—'}</td>
                    <td className="py-2 text-right font-medium text-green-700">{formatINR(a.amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
