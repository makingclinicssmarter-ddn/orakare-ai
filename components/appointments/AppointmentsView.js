'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const IST = 'Asia/Kolkata'

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST,
  })
}

function formatDayLong(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: IST,
  })
}

function formatDayShort(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: IST,
  })
}

function isoDay(d) {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: IST })
}

const SOURCE_STYLE = {
  WEBSITE:  { bg: 'bg-blue-50',  border: 'border-l-4 border-blue-500',  badge: 'bg-blue-100 text-blue-800',   label: 'Website'  },
  ORAKARE:  { bg: 'bg-green-50', border: 'border-l-4 border-green-500', badge: 'bg-green-100 text-green-800', label: 'OraKare'  },
  EXTERNAL: { bg: 'bg-slate-50', border: 'border-l-4 border-slate-400', badge: 'bg-slate-200 text-slate-700', label: 'Calendar' },
}

const STATUS_STYLE = {
  SCHEDULED: { label: 'Scheduled', tone: 'bg-blue-50 text-blue-700'   },
  CONFIRMED: { label: 'Confirmed', tone: 'bg-green-50 text-green-700' },
  COMPLETED: { label: 'Completed', tone: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-red-50 text-red-700'     },
  NO_SHOW:   { label: 'No-show',   tone: 'bg-amber-50 text-amber-800' },
}

function AppointmentCard({ apt }) {
  const sourceStyle = SOURCE_STYLE[apt.source] || SOURCE_STYLE.EXTERNAL
  const statusStyle = STATUS_STYLE[apt.status] || STATUS_STYLE.SCHEDULED
  const isCancelled = apt.status === 'CANCELLED'

  return (
    <div className={
      'rounded-lg p-3 ' + sourceStyle.bg + ' ' + sourceStyle.border +
      (isCancelled ? ' opacity-50' : '')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">
              {formatTime(apt.date)}
            </div>
            {apt.patient ? (
              <Link
                href={'/dashboard/patients/' + apt.patient.id}
                className="text-sm font-medium text-slate-900 hover:text-indigo-700 underline-offset-2 hover:underline"
              >
                {apt.patient.name}
              </Link>
            ) : (
              <span className="text-sm font-medium text-slate-900">{apt.name}</span>
            )}
            {apt.patient && (
              <span className="text-[10px] text-slate-400">· {apt.patient.originalID}</span>
            )}
          </div>
          {apt.service && (
            <div className="text-xs text-slate-600 mt-0.5">{apt.service}</div>
          )}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {apt.phone && (
              <a href={'tel:' + apt.phone} className="text-[11px] text-slate-500 hover:text-indigo-700">
                📞 {apt.phone}
              </a>
            )}
            {apt.email && (
              <span className="text-[11px] text-slate-400 truncate">{apt.email}</span>
            )}
          </div>
          {apt.notes && (
            <div className="text-[11px] text-slate-600 mt-1 italic">{apt.notes}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={'text-[10px] px-2 py-0.5 rounded font-medium ' + sourceStyle.badge}>
            {sourceStyle.label}
          </span>
          <span className={'text-[10px] px-2 py-0.5 rounded font-medium ' + statusStyle.tone}>
            {statusStyle.label}
          </span>
        </div>
      </div>
      {!apt.patient && apt.phone && (
        <div className="mt-2 text-[10px] text-slate-400">
          No matching patient record. They may be a new patient.
        </div>
      )}
    </div>
  )
}

export default function AppointmentsView({ appointments, initialView, focusDayIso }) {
  const router = useRouter()
  const [view, setView] = useState(initialView || 'day')
  const [focusDay, setFocusDay] = useState(new Date(focusDayIso))
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)

  const todayKey = isoDay(focusDay)

  // Bucket appointments by IST day
  const buckets = useMemo(function() {
    const map = {}
    appointments.forEach(function(a) {
      const k = isoDay(a.date)
      if (!map[k]) map[k] = []
      map[k].push(a)
    })
    return map
  }, [appointments])

  const dayAppointments = buckets[todayKey] || []
  const activeDayCount = dayAppointments.filter(function(a) { return a.status !== 'CANCELLED' }).length

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/appointments/sync', { method: 'POST' })
      const data = await res.json().catch(function() { return {} })
      if (res.ok && data.ok) {
        const s = data.summary || {}
        setSyncMsg('Synced. ' + (s.created || 0) + ' new, ' + (s.updated || 0) + ' updated, ' + (s.cancelled || 0) + ' cancelled.')
        setTimeout(function() { router.refresh(); setSyncMsg(null) }, 1500)
      } else {
        setSyncMsg('Sync failed: ' + (data.error || 'unknown error'))
      }
    } catch (e) {
      setSyncMsg('Network error')
    } finally {
      setSyncing(false)
    }
  }

  function goToDay(offset) {
    const d = new Date(focusDay)
    d.setDate(d.getDate() + offset)
    setFocusDay(d)
  }

  function goToToday() {
    const now = new Date()
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: IST }))
    setFocusDay(new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate()))
  }

  // Sorted list of all upcoming + recent, capped
  const sortedAll = useMemo(function() {
    return [...appointments].sort(function(a, b) {
      return new Date(a.date) - new Date(b.date)
    })
  }, [appointments])

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-medium text-slate-900">Appointments</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Synced from Google Calendar every 10 minutes
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
        {syncMsg && (
          <div className="mt-3 text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded px-3 py-2">
            {syncMsg}
          </div>
        )}
        {/* Tabs */}
        <div className="flex gap-0 mt-5 border-b border-slate-200 -mb-5">
          <button
            onClick={function() { setView('day') }}
            className={
              'px-5 py-3 text-sm border-b-2 transition ' +
              (view === 'day'
                ? 'border-primary-700 text-primary-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            Day view
          </button>
          <button
            onClick={function() { setView('list') }}
            className={
              'px-5 py-3 text-sm border-b-2 transition ' +
              (view === 'list'
                ? 'border-primary-700 text-primary-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            List view
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* DAY VIEW */}
        {view === 'day' && (
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button onClick={function() { goToDay(-1) }}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center">
                  ←
                </button>
                <button onClick={goToToday}
                  className="text-xs px-3 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Today
                </button>
                <button onClick={function() { goToDay(1) }}
                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center">
                  →
                </button>
              </div>
              <div className="flex-1 text-center">
                <div className="text-lg font-semibold text-slate-900">{formatDayLong(focusDay)}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {activeDayCount} active appointment{activeDayCount === 1 ? '' : 's'}
                </div>
              </div>
              <div className="w-[180px]"></div>{/* spacer for symmetry */}
            </div>

            {dayAppointments.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <div className="text-sm text-slate-500">No appointments on this day</div>
                <div className="text-xs text-slate-400 mt-1">Use ← → to browse or click "Sync now" to refresh from Calendar</div>
              </div>
            ) : (
              <div className="space-y-2">
                {dayAppointments.map(function(a) {
                  return <AppointmentCard key={a.id} apt={a} />
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-50 border-l-2 border-blue-500"></span>
                Website booking
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-50 border-l-2 border-green-500"></span>
                Created in OraKare
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-50 border-l-2 border-slate-400"></span>
                Direct in Calendar
              </div>
            </div>
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <div>
            {sortedAll.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
                No appointments in the visible window.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">When</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Service</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Source</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAll.map(function(a) {
                      const sourceStyle = SOURCE_STYLE[a.source] || SOURCE_STYLE.EXTERNAL
                      const statusStyle = STATUS_STYLE[a.status] || STATUS_STYLE.SCHEDULED
                      const isCancelled = a.status === 'CANCELLED'
                      return (
                        <tr key={a.id} className={'border-b border-slate-100 ' + (isCancelled ? 'opacity-50' : '')}>
                          <td className="py-3 px-4 text-xs text-slate-700">
                            <div>{formatDayShort(a.date)}</div>
                            <div className="text-slate-400">{formatTime(a.date)}</div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {a.patient ? (
                              <Link href={'/dashboard/patients/' + a.patient.id} className="text-slate-900 hover:text-indigo-700">
                                {a.patient.name}
                              </Link>
                            ) : (
                              <div className="text-slate-700">{a.name}</div>
                            )}
                            {a.patient && (
                              <div className="text-[10px] text-slate-400">{a.patient.originalID}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">{a.service || '—'}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">{a.phone || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={'text-[10px] px-2 py-0.5 rounded font-medium ' + sourceStyle.badge}>
                              {sourceStyle.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={'text-[10px] px-2 py-0.5 rounded font-medium ' + statusStyle.tone}>
                              {statusStyle.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Showing {sortedAll.length} appointments from 7 days back to 60 days ahead.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
