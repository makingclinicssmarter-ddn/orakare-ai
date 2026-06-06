'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppointmentForm from './AppointmentForm'

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border border-blue-200',
  CONFIRMED: 'bg-green-50 text-green-700 border border-green-200',
  COMPLETED: 'bg-gray-100 text-gray-500 border border-gray-200',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-200',
  NO_SHOW: 'bg-orange-50 text-orange-700 border border-orange-200',
}

const STATUS_LABELS = {
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function AppointmentCalendar({ appointments, selectedDate, clinicId }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const date = new Date(selectedDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function goToDate(d) {
    const dateStr = d.toISOString().split('T')[0]
    router.push('/dashboard/appointments?date=' + dateStr)
  }

  function prevMonth() {
    const d = new Date(year, month - 1, 1)
    goToDate(d)
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1)
    goToDate(d)
  }

  function selectDay(day) {
    const d = new Date(year, month, day)
    goToDate(d)
  }

  async function updateStatus(id, status) {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (e) {
      alert('Failed to update status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const selectedDay = date.getDate()
  const isToday = date.toDateString() === today.toDateString()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(function(d) {
            return (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map(function(_, i) {
            return <div key={'empty-' + i} />
          })}
          {Array.from({ length: daysInMonth }).map(function(_, i) {
            const day = i + 1
            const isSelected = day === selectedDay
            const isTod = new Date(year, month, day).toDateString() === today.toDateString()

            return (
              <button
                key={day}
                onClick={function() { selectDay(day) }}
                className={'w-full aspect-square flex items-center justify-center text-xs rounded-lg transition ' +
                  (isSelected
                    ? 'bg-indigo-600 text-white font-medium'
                    : isTod
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                  )}
              >
                {day}
              </button>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={function() { goToDate(today) }}
            className="w-full text-xs text-indigo-600 font-medium hover:underline"
          >
            Go to today
          </button>
        </div>
      </div>

      {/* Appointments for selected day */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {isToday ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={function() { setShowForm(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New appointment
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">No appointments</p>
            <p className="text-xs text-gray-400 mb-4">Book an appointment for this day</p>
            <button
              onClick={function() { setShowForm(true) }}
              className="text-sm text-indigo-600 font-medium hover:underline"
            >
              Book appointment
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map(function(appt) {
              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-semibold text-indigo-700">
                        {appt.slot || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{appt.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {appt.service}
                          {appt.phone && ' · ' + appt.phone}
                        </p>
                        {appt.notes && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2 py-1">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_COLORS[appt.status] || STATUS_COLORS.SCHEDULED)}>
                        {STATUS_LABELS[appt.status] || appt.status}
                      </span>
                      {appt.status === 'SCHEDULED' && (
                        <div className="flex gap-1">
                          <button
                            onClick={function() { updateStatus(appt.id, 'CONFIRMED') }}
                            disabled={updatingId === appt.id}
                            className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={function() { updateStatus(appt.id, 'CANCELLED') }}
                            disabled={updatingId === appt.id}
                            className="text-xs px-2 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <button
                          onClick={function() { updateStatus(appt.id, 'COMPLETED') }}
                          disabled={updatingId === appt.id}
                          className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                        >
                          Mark complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New appointment slide-in */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-20 z-40"
            onClick={function() { setShowForm(false) }}
          />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">New appointment</h2>
                <button
                  onClick={function() { setShowForm(false) }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <AppointmentForm
                selectedDate={selectedDate}
                onClose={function() { setShowForm(false) }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}