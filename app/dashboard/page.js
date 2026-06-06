import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const { userId } = await auth()

  let stats = {
    todayPatients: 0,
    waiting: 0,
    completed: 0,
    pendingRecords: 0,
  }

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const todayVisits = await db.visit.findMany({
      where: {
        createdAt: { gte: todayStart }
      }
    })

    stats.todayPatients = todayVisits.length
    stats.waiting = todayVisits.filter(function(v) {
      return v.status === 'REGISTERED' || v.status === 'HISTORY_TAKEN'
    }).length
    stats.completed = todayVisits.filter(function(v) {
      return v.status === 'COMPLETED'
    }).length
    stats.pendingRecords = todayVisits.filter(function(v) {
      return v.status === 'TREATMENT_CONSENT_SIGNED'
    }).length
  } catch (e) {
    // db not reachable
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Good morning</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Today</p>
          <p className="text-3xl font-semibold text-gray-900">{stats.todayPatients}</p>
          <p className="text-xs text-gray-500 mt-1">patients</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Waiting</p>
          <p className="text-3xl font-semibold text-amber-600">{stats.waiting}</p>
          <p className="text-xs text-gray-500 mt-1">in queue</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Completed</p>
          <p className="text-3xl font-semibold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500 mt-1">today</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Records due</p>
          <p className="text-3xl font-semibold text-indigo-600">{stats.pendingRecords}</p>
          <p className="text-xs text-gray-500 mt-1">pending</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Link
            href="/dashboard/patients"
            className="flex items-center gap-4 bg-indigo-600 text-white rounded-xl p-4 hover:bg-indigo-700 transition"
          >
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Register new patient</p>
              <p className="text-xs text-indigo-200 mt-0.5">Start a new visit</p>
            </div>
          </Link>

          <Link
            href="/dashboard/patients"
            className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">View patient queue</p>
              <p className="text-xs text-gray-400 mt-0.5">See today&apos;s appointments</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Feature highlights */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">How OraKare AI helps you</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">AI image analysis</p>
            <p className="text-xs text-gray-500 leading-relaxed">Upload intraoral photos and X-rays for AI-assisted findings — doctor reviews every suggestion.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">Medico-legal protection</p>
            <p className="text-xs text-gray-500 leading-relaxed">Digital consent, locked records, and full audit trail — every decision documented.</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800 mb-1">ABHA ready</p>
            <p className="text-xs text-gray-500 leading-relaxed">Records stored in FHIR-ready format — prepared for mandatory ABDM compliance.</p>
          </div>
        </div>
      </div>
    </div>
  )
}