'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CONDITIONS = ['Diabetes', 'Hypertension', 'Heart disease', 'Asthma', 'Thyroid', 'Kidney disease', 'Bleeding disorder', 'Epilepsy', 'HIV/AIDS', 'Cancer', 'Pregnancy']
const ALLERGIES = ['Penicillin', 'Aspirin', 'Ibuprofen', 'Latex', 'Local anaesthesia', 'Sulfa drugs']
const DENTAL_HISTORY_OPTS = ['Previous RCT', 'Dentures / partial dentures', 'Orthodontic treatment', 'Implants', 'Extractions', 'Bleeding after dental procedure', 'Dry socket', 'Jaw surgery']
const PERSONAL_OPTS = ['Smoker', 'Tobacco chewer', 'Alcohol use', 'Bruxism (grinding)', 'Mouth breathing', 'Nail biting', 'Thumb sucking (child)']

function Tag({ label, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        'text-xs px-3 py-1.5 rounded-full border transition ' +
        (selected
          ? 'bg-primary-700 text-white border-primary-700'
          : 'bg-white text-slate-600 border-slate-200 hover:border-primary-400')
      }
    >
      {label}
    </button>
  )
}

function RegisterForm({ doctor, onSuccess }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', age: '', gender: '', mobile: '', address: '', abhaId: '',
    conditions: [], allergies: [], medications: '',
    dentalHistory: [], personalHistory: [],
    otherCondition: '', otherAllergy: '',
  })

  function update(field, value) {
    setForm(function(p) { return { ...p, [field]: value } })
  }

  function toggleArray(field, value) {
    setForm(function(p) {
      const arr = p[field]
      return {
        ...p,
        [field]: arr.includes(value)
          ? arr.filter(function(v) { return v !== value })
          : [...arr, value],
      }
    })
  }

  async function handleSubmit() {
    if (!form.name || !form.age || !form.gender || !form.mobile) {
      alert('Name, age, gender and mobile are required')
      return
    }
    setSaving(true)
    try {
      const medications = form.medications
        ? form.medications.split(',').map(function(m) { return m.trim() }).filter(Boolean)
        : []
      const conditions = form.otherCondition
        ? [...form.conditions, form.otherCondition]
        : form.conditions
      const allergies = form.otherAllergy
        ? [...form.allergies, form.otherAllergy]
        : form.allergies

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          age: form.age,
          gender: form.gender,
          mobile: form.mobile,
          address: form.address,
          abhaId: form.abhaId,
          medicalHistory: { conditions, allergies, medications },
          dentalHistory: { history: form.dentalHistory },
          personalHistory: { habits: form.personalHistory },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onSuccess(data.patient)
      } else {
        alert('Failed to register patient. Please try again.')
      }
    } catch (e) {
      alert('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {['Basic details', 'Medical history', 'Dental & personal'].map(function(label, i) {
          const n = i + 1
          return (
            <div key={n} className="flex items-center gap-2">
              <div className={
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition ' +
                (step === n ? 'bg-primary-700 text-white' :
                 step > n ? 'bg-primary-100 text-primary-700' :
                 'bg-slate-100 text-slate-400')
              }>{n}</div>
              <span className={
                'text-sm ' +
                (step === n ? 'text-slate-900 font-medium' : 'text-slate-400')
              }>{label}</span>
              {i < 2 && <div className="w-8 h-px bg-slate-200 ml-1" />}
            </div>
          )
        })}
      </div>

      {/* Step 1 — Basic details */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={function(e) { update('name', e.target.value) }}
                placeholder="Patient's full name"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={function(e) { update('age', e.target.value) }}
                placeholder="Years"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={function(e) { update('gender', e.target.value) }}
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Mobile</label>
              <input
                type="tel"
                value={form.mobile}
                onChange={function(e) { update('mobile', e.target.value) }}
                placeholder="+91"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">ABHA ID <span className="text-slate-300 normal-case font-normal">optional</span></label>
              <input
                type="text"
                value={form.abhaId}
                onChange={function(e) { update('abhaId', e.target.value) }}
                placeholder="XX-XXXX-XXXX-XXXX"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Address <span className="text-slate-300 normal-case font-normal">optional</span></label>
              <textarea
                value={form.address}
                onChange={function(e) { update('address', e.target.value) }}
                placeholder="Street, area, city"
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={function() { setStep(2) }}
              disabled={!form.name || !form.age || !form.gender || !form.mobile}
              className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition disabled:opacity-40"
            >
              Next — Medical history
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Medical history */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Medical conditions</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(function(c) {
                return <Tag key={c} label={c} selected={form.conditions.includes(c)} onToggle={function() { toggleArray('conditions', c) }} />
              })}
            </div>
            <input
              type="text"
              value={form.otherCondition}
              onChange={function(e) { update('otherCondition', e.target.value) }}
              placeholder="Other condition..."
              className="mt-3 w-full h-9 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Allergies</label>
            <div className="flex flex-wrap gap-2">
              {ALLERGIES.map(function(a) {
                return <Tag key={a} label={a} selected={form.allergies.includes(a)} onToggle={function() { toggleArray('allergies', a) }} />
              })}
            </div>
            <input
              type="text"
              value={form.otherAllergy}
              onChange={function(e) { update('otherAllergy', e.target.value) }}
              placeholder="Other allergy..."
              className="mt-3 w-full h-9 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Current medications <span className="text-slate-300 normal-case font-normal">optional — comma separated</span></label>
            <input
              type="text"
              value={form.medications}
              onChange={function(e) { update('medications', e.target.value) }}
              placeholder="e.g. Metformin, Amlodipine"
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <div className="flex justify-between">
            <button
              onClick={function() { setStep(1) }}
              className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              onClick={function() { setStep(3) }}
              className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition"
            >
              Next — Dental & personal history
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Dental & personal history */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Previous dental history</label>
            <div className="flex flex-wrap gap-2">
              {DENTAL_HISTORY_OPTS.map(function(d) {
                return <Tag key={d} label={d} selected={form.dentalHistory.includes(d)} onToggle={function() { toggleArray('dentalHistory', d) }} />
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Personal habits</label>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_OPTS.map(function(p) {
                return <Tag key={p} label={p} selected={form.personalHistory.includes(p)} onToggle={function() { toggleArray('personalHistory', p) }} />
              })}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={function() { setStep(2) }}
              className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-primary-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition disabled:opacity-40"
            >
              {saving ? 'Registering...' : 'Register patient'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Shared helper: calls /api/consultation/start to get a visitId, then navigates
// to the correct screen of the consultation flow. Replaces the previous broken
// pattern of pushing to /dashboard/consultation/<patientId> with no visitId.
async function startConsultation(router, patientId) {
  try {
    const res = await fetch('/api/consultation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId })
    })
    if (!res.ok) {
      alert('Failed to start consultation. Please try again.')
      return
    }
    const data = await res.json()
    const base = '/dashboard/consultation/' + patientId + '/' + data.visitId
    const routes = {
      start: base + '/start',
      examination: base + '/examination',
      treatment: base + '/treatment',
      consent: base + '/consent',
      sittings: base + '/sittings',
    }
    router.push(routes[data.goTo] || routes.start)
  } catch (e) {
    alert('Failed to start consultation. Please try again.')
  }
}

function PatientRow({ patient }) {
  const router = useRouter()
  const lastVisit = patient.visits?.[0]
  const statusColors = {
    REGISTERED: 'bg-slate-100 text-slate-600',
    HISTORY_TAKEN: 'bg-blue-50 text-blue-700',
    EXAMINATION_DONE: 'bg-amber-50 text-amber-700',
    TREATMENT_PLANNED: 'bg-purple-50 text-purple-700',
    TREATMENT_CONSENT_SIGNED: 'bg-teal-50 text-teal-700',
    COMPLETED: 'bg-green-50 text-green-700',
  }

  return (
    <tr
      onClick={function() { startConsultation(router, patient.id) }}
      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-xs font-medium text-primary-700">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">{patient.name}</div>
            <div className="text-xs text-slate-400">{patient.originalID}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-slate-600">{patient.age}y · {patient.gender}</td>
      <td className="py-3 px-4 text-sm text-slate-600">{patient.mobile}</td>
      <td className="py-3 px-4">
        {lastVisit ? (
          <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (statusColors[lastVisit.status] || statusColors.REGISTERED)}>
            {lastVisit.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase() })}
          </span>
        ) : (
          <span className="text-xs text-slate-300">No visits</span>
        )}
      </td>
      <td className="py-3 px-4 text-xs text-slate-400">
        {lastVisit
          ? new Date(lastVisit.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : new Date(patient.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="py-3 px-4">
        <button
          onClick={function(e) {
            e.stopPropagation()
            startConsultation(router, patient.id)
          }}
          className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded-lg hover:bg-primary-800 transition"
        >
          Start consultation
        </button>
      </td>
    </tr>
  )
}

export default function PatientsPage({ doctor, recentPatients, totalCount }) {
  const router = useRouter()
  const [tab, setTab] = useState('register')
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState(recentPatients)
  const [searching, setSearching] = useState(false)
  const [registered, setRegistered] = useState(null)

  async function handleSearch(value) {
    setSearch(value)
    if (!value.trim()) {
      setPatients(recentPatients)
      return
    }
    setSearching(true)
    try {
      const res = await fetch('/api/patients?search=' + encodeURIComponent(value))
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients)
      }
    } finally {
      setSearching(false)
    }
  }

  function handleRegistered(patient) {
    setRegistered(patient)
  }

  if (registered) {
    return (
      <div className="p-8 max-w-lg">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-primary-700" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-slate-900 mb-1">{registered.name} registered</h2>
          <p className="text-sm text-slate-500 mb-1">{registered.originalID}</p>
          <p className="text-xs text-slate-400 mb-6">Patient record created successfully</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={function() {
                startConsultation(router, registered.id)
              }}
              className="bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition"
            >
              Start consultation
            </button>
            <button
              onClick={function() { setRegistered(null) }}
              className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition"
            >
              Register another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-slate-900">Patients</h1>
            <p className="text-sm text-slate-400 mt-0.5">{totalCount} total patients</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 mt-5 border-b border-slate-200 -mb-5">
          <button
            onClick={function() { setTab('register') }}
            className={
              'px-5 py-3 text-sm border-b-2 transition ' +
              (tab === 'register'
                ? 'border-primary-700 text-primary-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            Register new patient
          </button>
          <button
            onClick={function() { setTab('all') }}
            className={
              'px-5 py-3 text-sm border-b-2 transition ' +
              (tab === 'all'
                ? 'border-primary-700 text-primary-700 font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700')
            }
          >
            All patients
          </button>
        </div>
      </div>

      <div className="p-8">
        {/* Register tab */}
        {tab === 'register' && (
          <RegisterForm doctor={doctor} onSuccess={handleRegistered} />
        )}

        {/* All patients tab */}
        {tab === 'all' && (
          <div>
            <div className="mb-5">
              <input
                type="text"
                value={search}
                onChange={function(e) { handleSearch(e.target.value) }}
                placeholder="Search by name, mobile or patient ID..."
                className="w-full max-w-md h-10 border border-slate-200 rounded-lg px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Patient</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Age / Gender</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Mobile</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Last visit</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {searching ? (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Searching...</td></tr>
                  ) : patients.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No patients found</td></tr>
                  ) : (
                    patients.map(function(p) {
                      return <PatientRow key={p.id} patient={p} />
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!search && (
              <p className="text-xs text-slate-400 mt-3">Showing most recent 50 patients · {totalCount} total</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}