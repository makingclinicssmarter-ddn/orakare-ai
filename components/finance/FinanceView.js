'use client'

import { useState } from 'react'

function getMonthRange(from, to) {
  const months = []
  const cur = new Date(from + '-01')
  const end = new Date(to + '-01')
  while (cur <= end) {
    months.push(cur.getFullYear() + '-' + String(cur.getMonth() + 1).padStart(2, '0'))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

function inRange(dateStr, from, to) {
  const m = (dateStr || '').slice(0, 7)
  return m >= from && m <= to
}

export default function FinanceView({ sittings, expenses, feeEntries }) {
  const now = new Date()
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 2)
  const threeMonthsAgoStr = threeMonthsAgo.getFullYear() + '-' + String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')

  const [from, setFrom] = useState(threeMonthsAgoStr)
  const [to, setTo] = useState(thisMonth)

  function setPeriod(type) {
    if (type === 'this') { setFrom(thisMonth); setTo(thisMonth) }
    else if (type === 'last3') { setFrom(threeMonthsAgoStr); setTo(thisMonth) }
    else {
      const yr = now.getFullYear()
      setFrom(yr + '-01')
      setTo(yr + '-12')
    }
  }

  const filteredSittings = sittings.filter(function(s) { return inRange(s.date ? new Date(s.date).toISOString() : '', from, to) })
  const filteredExpenses = expenses.filter(function(e) { return inRange(e.date ? new Date(e.date).toISOString() : '', from, to) })
  const filteredFees = feeEntries.filter(function(f) { return inRange(f.createdAt ? new Date(f.createdAt).toISOString() : '', from, to) })

  const revenue = filteredSittings.reduce(function(sum, s) { return sum + Number(s.paid || 0) }, 0)
  const expTotal = filteredExpenses.reduce(function(sum, e) { return sum + Number(e.amount || 0) }, 0)
  const feesTotal = filteredFees.reduce(function(sum, f) { return sum + Number(f.consultantShare || 0) }, 0)
  const feesPending = filteredFees.filter(function(f) { return (f.status || 'Pending') === 'Pending' }).reduce(function(sum, f) { return sum + Number(f.consultantShare || 0) }, 0)
  const profit = revenue - expTotal - feesTotal

  const months = getMonthRange(from, to)

  const monthRevenue = {}
  const monthExp = {}
  months.forEach(function(m) { monthRevenue[m] = 0; monthExp[m] = 0 })

  filteredSittings.forEach(function(s) {
    const m = s.date ? new Date(s.date).toISOString().slice(0, 7) : ''
    if (monthRevenue[m] !== undefined) monthRevenue[m] += Number(s.paid || 0)
  })
  filteredExpenses.forEach(function(e) {
    const m = e.date ? new Date(e.date).toISOString().slice(0, 7) : ''
    if (monthExp[m] !== undefined) monthExp[m] += Number(e.amount || 0)
  })

  const maxVal = Math.max(...months.map(function(m) { return Math.max(monthRevenue[m], monthExp[m]) }), 1)

  const catTotals = {}
  filteredExpenses.forEach(function(e) {
    const c = e.category || 'Other'
    catTotals[c] = (catTotals[c] || 0) + Number(e.amount || 0)
  })

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="space-y-4">

      {/* Period selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-gray-600">Period:</span>
          <input
            type="month"
            value={from}
            onChange={function(e) { setFrom(e.target.value) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="month"
            value={to}
            onChange={function(e) { setTo(e.target.value) }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 ml-auto">
            {[
              { label: 'This month', type: 'this' },
              { label: 'Last 3 months', type: 'last3' },
              { label: 'This year', type: 'year' },
            ].map(function(p) {
              return (
                <button
                  key={p.type}
                  onClick={function() { setPeriod(p.type) }}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Revenue', value: '₹' + revenue.toLocaleString('en-IN'), color: 'text-teal-700' },
          { label: 'Expenses', value: '₹' + expTotal.toLocaleString('en-IN'), color: 'text-red-600' },
          { label: 'Consultant fees', value: '₹' + feesTotal.toLocaleString('en-IN'), sub: feesPending > 0 ? '₹' + feesPending.toLocaleString('en-IN') + ' pending' : 'All paid', color: 'text-amber-600' },
          { label: 'Net profit', value: '₹' + profit.toLocaleString('en-IN'), color: profit >= 0 ? 'text-teal-700' : 'text-red-600' },
        ].map(function(stat) {
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={'text-lg font-semibold mt-1 ' + stat.color}>{stat.value}</p>
              {stat.sub && <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>}
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Monthly revenue vs expenses</h3>
          <div className="flex items-flex-end gap-2" style={{ height: '160px', alignItems: 'flex-end', borderBottom: '1px solid #f3f4f6', paddingBottom: '4px' }}>
            {months.map(function(m) {
              const revH = Math.max(4, Math.round(monthRevenue[m] / maxVal * 140))
              const expH = Math.max(2, Math.round(monthExp[m] / maxVal * 140))
              const profH = Math.max(2, Math.round(Math.max(0, monthRevenue[m] - monthExp[m]) / maxVal * 140))
              return (
                <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '148px' }}>
                    <div style={{ background: '#0f6e56', borderRadius: '3px 3px 0 0', width: '8px', height: revH + 'px' }} title={'Revenue: ₹' + monthRevenue[m]} />
                    <div style={{ background: '#c0392b', borderRadius: '3px 3px 0 0', width: '8px', height: expH + 'px' }} title={'Expenses: ₹' + monthExp[m]} />
                    <div style={{ background: '#0d9488', borderRadius: '3px 3px 0 0', width: '8px', height: profH + 'px' }} title={'Profit: ₹' + (monthRevenue[m] - monthExp[m])} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-1 mt-1">
            {months.map(function(m) {
              return (
                <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#9ca3af' }}>
                  {MONTH_LABELS[parseInt(m.split('-')[1]) - 1]}
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3">
            {[
              { color: '#0f6e56', label: 'Revenue' },
              { color: '#c0392b', label: 'Expenses' },
              { color: '#0d9488', label: 'Profit' },
            ].map(function(l) {
              return (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color }} />
                  <span className="text-xs text-gray-500">{l.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Expenses by category</h3>
          {Object.keys(catTotals).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expenses in this period</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(catTotals).sort(function(a, b) { return b[1] - a[1] }).map(function(entry) {
                const cat = entry[0]
                const amt = entry[1]
                const pct = Math.round(amt / expTotal * 100)
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">{cat}</span>
                      <span className="text-xs font-medium text-gray-700">₹{amt.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-red-400 h-1.5 rounded-full" style={{ width: pct + '%' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sittings summary */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Period summary</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total sittings', value: filteredSittings.length },
            { label: 'Avg per sitting', value: filteredSittings.length > 0 ? '₹' + Math.round(revenue / filteredSittings.length).toLocaleString('en-IN') : '—' },
            { label: 'Total expenses', value: filteredExpenses.length },
            { label: 'Consultant fees pending', value: filteredFees.filter(function(f) { return (f.status || 'Pending') === 'Pending' }).length },
          ].map(function(stat) {
            return (
              <div key={stat.label} className="text-center border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-400">{stat.label}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{stat.value}</p>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}