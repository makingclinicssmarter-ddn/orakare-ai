'use client'
import Link from 'next/link'

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

function PieChart({ data, valueLabel }) {
  const total = data.reduce(function(s, d) { return s + d.value }, 0)
  if (total === 0) return <div className="text-xs text-slate-400 py-8 text-center">No data yet</div>
  let cumulative = 0
  const size = 100
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4
  return (
    <svg width={120} height={120} viewBox={'0 0 ' + size + ' ' + size}>
      {data.map(function(d, i) {
        const startAngle = (cumulative / total) * 2 * Math.PI
        cumulative += d.value
        const endAngle = (cumulative / total) * 2 * Math.PI
        const x1 = cx + r * Math.sin(startAngle)
        const y1 = cy - r * Math.cos(startAngle)
        const x2 = cx + r * Math.sin(endAngle)
        const y2 = cy - r * Math.cos(endAngle)
        const large = (endAngle - startAngle) > Math.PI ? 1 : 0
        const path = 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' Z'
        return <path key={i} d={path} fill={PIE_COLORS[i % PIE_COLORS.length]} />
      })}
    </svg>
  )
}

function BarChartMonthly({ revenueByMonth, expByMonth, months }) {
  const maxVal = Math.max(
    1,
    ...months.map(function(m) { return revenueByMonth[m] || 0 }),
    ...months.map(function(m) { return expByMonth[m] || 0 })
  )
  return (
    <div className="grid grid-cols-6 gap-2 mt-4">
      {months.map(function(m) {
        const r = revenueByMonth[m] || 0
        const e = expByMonth[m] || 0
        const rH = Math.max(4, (r / maxVal) * 100)
        const eH = Math.max(4, (e / maxVal) * 100)
        return (
          <div key={m} className="flex flex-col items-center">
            <div className="flex items-end gap-1 h-24">
              <div title={'Revenue ' + formatINR(r)} style={{ width: 12, height: rH + '%', background: '#10b981', borderRadius: 2 }}></div>
              <div title={'Expenses ' + formatINR(e)} style={{ width: 12, height: eH + '%', background: '#ef4444', borderRadius: 2 }}></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{m}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardView(props) {
  const {
    doctorName, clinicName,
    todayAppointments, monthRevenue, monthExpTotal,
    totalPatients, activeTreatmentsCount, balancePending,
    pieData, treatmentsRevenueData,
    lowStockCount, expiringSoonCount, stockValue,
    revenueByMonth, expByMonth, months,
    pendingFees,
  } = props

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{clinicName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Hi {doctorName}, here's how your clinic is doing.</p>
        </div>
      </div>

      {/* Stat cards row 1 — Financial */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '12px' }}>
        <Link href="/dashboard/finance" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: '14px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: '#0F6E56', fontWeight: 500 }}>💰 This month</p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: '#085041', marginTop: 4 }}>{formatINR(monthRevenue)}</p>
            <p style={{ fontSize: '11px', color: '#0F6E56', marginTop: 2 }}>Expenses: {formatINR(monthExpTotal)} →</p>
          </div>
        </Link>
        <Link href="/dashboard/patients" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#EEEDFE', border: '0.5px solid #CECBF6', borderRadius: '14px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: '#534AB7', fontWeight: 500 }}>👤 Total patients</p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: '#3C3489', marginTop: 4 }}>{totalPatients}</p>
            <p style={{ fontSize: '11px', color: '#534AB7', marginTop: 2 }}>{activeTreatmentsCount} active treatments</p>
          </div>
        </Link>
        <Link href="/dashboard/balance" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: '14px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: '#A32D2D', fontWeight: 500 }}>⚖️ Balance pending</p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: '#A32D2D', marginTop: 4 }}>{formatINR(balancePending)}</p>
            <p style={{ fontSize: '11px', color: '#A32D2D', marginTop: 2 }}>Across all patients</p>
          </div>
        </Link>
      </div>

      {/* Stat cards row 2 — Inventory (Push #8 Bug 3) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        <Link href="/dashboard/inventory" style={{ textDecoration: 'none' }}>
          <div style={{ background: lowStockCount > 0 ? '#FCEBEB' : '#F1F5F9', border: '0.5px solid ' + (lowStockCount > 0 ? '#F7C1C1' : '#CBD5E1'), borderRadius: '14px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: lowStockCount > 0 ? '#A32D2D' : '#64748B', fontWeight: 500 }}>📉 Low-stock items</p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: lowStockCount > 0 ? '#A32D2D' : '#475569', marginTop: 4 }}>{lowStockCount}</p>
            <p style={{ fontSize: '11px', color: lowStockCount > 0 ? '#A32D2D' : '#64748B', marginTop: 2 }}>Below minimum reorder qty</p>
          </div>
        </Link>
        <Link href="/dashboard/inventory" style={{ textDecoration: 'none' }}>
          <div style={{ background: expiringSoonCount > 0 ? '#FAEEDA' : '#F1F5F9', border: '0.5px solid ' + (expiringSoonCount > 0 ? '#FAC775' : '#CBD5E1'), borderRadius: '14px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: expiringSoonCount > 0 ? '#854F0B' : '#64748B', fontWeight: 500 }}>⚠️ Expiring soon</p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: expiringSoonCount > 0 ? '#633806' : '#475569', marginTop: 4 }}>{expiringSoonCount}</p>
            <p style={{ fontSize: '11px', color: expiringSoonCount > 0 ? '#854F0B' : '#64748B', marginTop: 2 }}>Within 30 days</p>
          </div>
        </Link>
        <Link href="/dashboard/inventory" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#F0F9FF', border: '0.5px solid #BAE6FD', borderRadius: '14px', padding: '14px 16px' }}>
            <p style={{ fontSize: '11px', color: '#0369A1', fontWeight: 500 }}>📦 Stock value</p>
            <p style={{ fontSize: '22px', fontWeight: 600, color: '#0C4A6E', marginTop: 4 }}>{formatINR(stockValue)}</p>
            <p style={{ fontSize: '11px', color: '#0369A1', marginTop: 2 }}>Sum of active batches</p>
          </div>
        </Link>
      </div>

      {/* Treatments breakdown — volume + revenue side by side (Push #8 Bug 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-medium text-slate-700">Treatments — volume</h2>
            <span className="text-xs text-slate-400">By count</span>
          </div>
          <div className="flex items-center gap-4">
            <PieChart data={pieData} />
            <div className="flex-1 space-y-1">
              {pieData && pieData.length > 0 ? pieData.map(function(d, i) {
                return (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                    <span className="text-slate-700 flex-1 truncate">{d.name}</span>
                    <span className="text-slate-500">{d.value}</span>
                  </div>
                )
              }) : <div className="text-xs text-slate-400">No treatments yet</div>}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-sm font-medium text-slate-700">Treatments — revenue</h2>
            <span className="text-xs text-slate-400">By money collected</span>
          </div>
          <div className="flex items-center gap-4">
            <PieChart data={treatmentsRevenueData} />
            <div className="flex-1 space-y-1">
              {treatmentsRevenueData && treatmentsRevenueData.length > 0 ? treatmentsRevenueData.map(function(d, i) {
                return (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: PIE_COLORS[i % PIE_COLORS.length] }}></div>
                    <span className="text-slate-700 flex-1 truncate">{d.name}</span>
                    <span className="text-slate-500">{formatINR(d.value)}</span>
                  </div>
                )
              }) : <div className="text-xs text-slate-400">No revenue yet</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 6-month revenue vs expense */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-sm font-medium text-slate-700">Revenue &amp; expenses — last 6 months</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, background: '#10b981', borderRadius: 2 }}></span>Revenue</span>
            <span className="flex items-center gap-1"><span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2 }}></span>Expenses</span>
          </div>
        </div>
        <BarChartMonthly revenueByMonth={revenueByMonth} expByMonth={expByMonth} months={months} />
      </div>

      <div className="text-xs text-slate-400 mt-2">
        Today's appointments: <span className="font-medium text-slate-600">{todayAppointments}</span>
        {pendingFees && pendingFees.length > 0 && (
          <span> · Pending consultant fees: <span className="font-medium text-slate-600">{pendingFees.length}</span></span>
        )}
      </div>
    </div>
  )
}
