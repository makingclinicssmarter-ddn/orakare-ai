'use client'

import Link from 'next/link'

const PIE_COLORS = ['#1D9E75', '#534AB7', '#EF9F27', '#E24B4A', '#B4B2A9']
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function PieChart({ data }) {
  const total = data.reduce(function(s, d) { return s + d.value }, 0)
  if (total === 0) return (
    <div style={{ width: 130, height: 130, borderRadius: '50%', background: 'var(--color-background-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>No data</span>
    </div>
  )

  const circumference = 2 * Math.PI * 52
  const slices = data.map(function(d, i) {
  const dash = (d.value / total) * circumference
  const prevOffset = data.slice(0, i).reduce(function(sum, pd) {
    return sum + (pd.value / total) * circumference
  }, 0)
  return { dash, offset: prevOffset, color: PIE_COLORS[i] }
})

  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      {slices.map(function(s, i) {
        return (
          <circle
            key={i}
            cx="65" cy="65" r="52"
            fill="none"
            stroke={s.color}
            strokeWidth="26"
            strokeDasharray={s.dash + ' ' + (circumference - s.dash)}
            strokeDashoffset={-(s.offset)}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px' }}
          />
        )
      })}
      <circle cx="65" cy="65" r="39" fill="var(--color-background-primary)" />
      <text x="65" y="61" textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)" fontFamily="var(--font-sans)">Total</text>
      <text x="65" y="76" textAnchor="middle" fontSize="14" fontWeight="500" fill="var(--color-text-primary)" fontFamily="var(--font-sans)">{total}</text>
    </svg>
  )
}

function LineChart({ months, revenueByMonth, expByMonth }) {
  const allVals = months.flatMap(function(m) { return [revenueByMonth[m] || 0, expByMonth[m] || 0] })
  const maxVal = Math.max(...allVals, 1)
  const W = 560
  const H = 120
  const padL = 0
  const padR = 0

  function x(i) { return padL + (i / (months.length - 1)) * (W - padL - padR) }
  function y(val) { return H - 10 - ((val / maxVal) * (H - 20)) }

  const revPoints = months.map(function(m, i) { return [x(i), y(revenueByMonth[m] || 0)] })
  const expPoints = months.map(function(m, i) { return [x(i), y(expByMonth[m] || 0)] })

  const revPath = revPoints.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1] }).join(' ')
  const expPath = expPoints.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1] }).join(' ')
  const revArea = revPath + ' L' + x(months.length-1) + ',' + H + ' L' + x(0) + ',' + H + ' Z'

  return (
    <svg width="100%" height="140" viewBox={'0 0 ' + W + ' 140'} preserveAspectRatio="none">
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(function(v) {
        const yy = y(maxVal * v)
        return <line key={v} x1="0" y1={yy} x2={W} y2={yy} stroke="var(--color-border-tertiary)" strokeWidth="0.5"/>
      })}
      <path d={revArea} fill="url(#rg)"/>
      <path d={revPath} fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <path d={expPath} fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3"/>
      {revPoints.map(function(p, i) {
        return <circle key={i} cx={p[0]} cy={p[1]} r={i === months.length-1 ? 5 : 3.5} fill="#1D9E75" stroke="var(--color-background-primary)" strokeWidth="1.5"/>
      })}
      {expPoints.map(function(p, i) {
        return <circle key={i} cx={p[0]} cy={p[1]} r={i === months.length-1 ? 4 : 3} fill="#E24B4A" stroke="var(--color-background-primary)" strokeWidth="1.5"/>
      })}
      {months.map(function(m, i) {
        const monthNum = parseInt(m.split('-')[1]) - 1
        return (
          <text key={m} x={x(i)} y="135" textAnchor="middle" fontSize="10" fill="#9ca3af" fontFamily="var(--font-sans)">
            {MONTH_LABELS[monthNum]}
          </text>
        )
      })}
    </svg>
  )
}

export default function DashboardView({
  doctorName, clinicName, todayAppointments, monthRevenue, monthExpTotal,
  totalPatients, activeTreatmentsCount, overdueCount, overduePatients,
  balancePending, lowStockCount, expiringCount, pendingFeeTotal,
  months, revenueByMonth, expByMonth, topTreatments, yesterdaySittings,
}) {
  const now = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dateStr = days[now.getDay()] + ', ' + now.getDate() + ' ' + monthNames[now.getMonth()] + ' ' + now.getFullYear()

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const AVATAR_COLORS = [
    ['#E1F5EE','#085041'], ['#FAEEDA','#633806'],
    ['#EEEDFE','#3C3489'], ['#FCEBEB','#791F1F'],
  ]

  const alerts = []
  if (overdueCount > 0) alerts.push({ type: 'red', text: overdueCount + ' patient' + (overdueCount > 1 ? 's' : '') + ' not seen in 30+ days', href: '/dashboard/records' })
  if (pendingFeeTotal > 0) alerts.push({ type: 'amber', text: '₹' + pendingFeeTotal.toLocaleString('en-IN') + ' consultant fees pending', href: '/dashboard/consultants' })
  if (lowStockCount > 0) alerts.push({ type: 'amber', text: lowStockCount + ' inventory item' + (lowStockCount > 1 ? 's' : '') + ' low or out of stock', href: '/dashboard/inventory' })
  if (expiringCount > 0) alerts.push({ type: 'blue', text: expiringCount + ' item' + (expiringCount > 1 ? 's' : '') + ' expiring within 30 days', href: '/dashboard/inventory' })
  if (alerts.length === 0) alerts.push({ type: 'teal', text: 'Everything looks good today!' })

  const pieData = topTreatments.slice(0, 5).map(function(t) { return { name: t[0], value: t[1] } })

  const ALERT_STYLES = {
    red:   { bg: '#FCEBEB', dot: '#A32D2D', text: '#791F1F' },
    amber: { bg: '#FAEEDA', dot: '#854F0B', text: '#633806' },
    blue:  { bg: '#E6F1FB', dot: '#185FA5', text: '#0C447C' },
    teal:  { bg: '#E1F5EE', dot: '#0F6E56', text: '#085041' },
  }

  function buildWAUrl(phone, message) {
    const clean = (phone || '').replace(/\D/g, '').slice(-10)
    if (!clean) return '#'
    return 'https://wa.me/91' + clean + '?text=' + encodeURIComponent(message)
  }

  function handleFollowUp() {
    if (yesterdaySittings.length === 0) {
      alert('No sittings recorded yesterday.')
      return
    }
    const patient = yesterdaySittings[0].patient
    if (!patient) return
    const msg = 'नमस्ते ' + patient.name.split(' ')[0] + ' जी 🙏\nकल की आपकी विज़िट के बाद हम उम्मीद करते हैं आप अच्छा महसूस कर रहे हैं।\nकोई तकलीफ हो तो हमें ज़रूर बताएं।\n- ' + clinicName
    window.open(buildWAUrl(patient.mobile, msg), '_blank')
  }

  function handleReview() {
    const reviewUrl = 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK'
    if (yesterdaySittings.length === 0) {
      alert('No sittings recorded yesterday.')
      return
    }
    const patient = yesterdaySittings[0].patient
    if (!patient) return
    const msg = 'नमस्ते ' + patient.name.split(' ')[0] + ' जी 🙏\nहमें आशा है कि ' + clinicName + ' में आपका अनुभव अच्छा रहा।\nकृपया यहाँ रिव्यू दें: ' + reviewUrl + '\nधन्यवाद 🙏'
    window.open(buildWAUrl(patient.mobile, msg), '_blank')
  }

  const STATUS_COLORS = {
    SCHEDULED: { bg: '#EEEDFE', color: '#3C3489', label: 'Scheduled' },
    CONFIRMED: { bg: '#E1F5EE', color: '#085041', label: 'Confirmed' },
    COMPLETED: { bg: '#F1EFE8', color: '#5F5E5A', label: 'Completed' },
    CANCELLED: { bg: '#FCEBEB', color: '#791F1F', label: 'Cancelled' },
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>

      {/* Greeting banner */}
      <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg,#0f6e56 0%,#1D9E75 100%)', borderRadius: '16px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '17px', fontWeight: '500', color: '#fff', marginBottom: '3px' }}>{greeting}, {doctorName}</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{clinicName} · Dehradun</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{dateStr}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''} today</p>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.25rem' }}>
        {[
          { label: 'This month', value: '₹' + monthRevenue.toLocaleString('en-IN'), sub: 'Expenses: ₹' + monthExpTotal.toLocaleString('en-IN'), bg: '#E1F5EE', border: '#9FE1CB', valColor: '#085041', subColor: '#0F6E56', icon: '💰' },
          { label: 'Total patients', value: totalPatients, sub: activeTreatmentsCount + ' active treatments', bg: '#EEEDFE', border: '#CECBF6', valColor: '#3C3489', subColor: '#534AB7', icon: '👤' },
          { label: 'Overdue patients', value: overdueCount, sub: 'Not seen in 30+ days', bg: '#FAEEDA', border: '#FAC775', valColor: '#633806', subColor: '#854F0B', icon: '🦷' },
          { label: 'Balance pending', value: '₹' + balancePending.toLocaleString('en-IN'), sub: 'Across all patients', bg: '#FCEBEB', border: '#F7C1C1', valColor: '#A32D2D', subColor: '#A32D2D', icon: '⚖️' },
        ].map(function(stat) {
          return (
            <div key={stat.label} style={{ background: stat.bg, border: '0.5px solid ' + stat.border, borderRadius: '14px', padding: '1rem 1.1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '18px', opacity: 0.7 }}>{stat.icon}</div>
              <p style={{ fontSize: '11px', color: '#5F5E5A', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</p>
              <p style={{ fontSize: '22px', fontWeight: '500', color: stat.valColor }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: stat.subColor, marginTop: '4px' }}>{stat.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Schedule + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Today&apos;s schedule</p>
            <Link href="/dashboard/appointments" style={{ fontSize: '11px', color: '#534AB7', textDecoration: 'none' }}>View all →</Link>
          </div>
          {todayAppointments.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No appointments today</p>
              <Link href="/dashboard/appointments" style={{ fontSize: '12px', color: '#534AB7', textDecoration: 'none', display: 'block', marginTop: '8px' }}>+ Book one</Link>
            </div>
          ) : (
            todayAppointments.slice(0, 5).map(function(appt) {
              const slot = appt.slot || new Date(appt.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
              const st = STATUS_COLORS[appt.status] || STATUS_COLORS.SCHEDULED
              return (
                <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <p style={{ fontSize: '12px', fontWeight: '500', color: '#534AB7', minWidth: '44px' }}>{slot}</p>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>{appt.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{appt.service || '—'}</p>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500', background: st.bg, color: st.color }}>{st.label}</span>
                </div>
              )
            })
          )}
        </div>

        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Alerts</p>
          {alerts.map(function(alert, i) {
            const s = ALERT_STYLES[alert.type]
            const inner = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: s.bg, marginBottom: '6px', cursor: alert.href ? 'pointer' : 'default' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
                <p style={{ fontSize: '12px', flex: 1, color: s.text }}>{alert.text}</p>
                {alert.href && <span style={{ fontSize: '12px', opacity: 0.5, color: s.text }}>→</span>}
              </div>
            )
            return alert.href ? (
              <Link key={i} href={alert.href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
            ) : (
              <div key={i}>{inner}</div>
            )
          })}
        </div>
      </div>

      {/* Pie chart + Overdue patients */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Top treatments</p>
            <Link href="/dashboard/records" style={{ fontSize: '11px', color: '#534AB7', textDecoration: 'none' }}>View records →</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <PieChart data={pieData} />
            <div style={{ flex: 1 }}>
              {pieData.map(function(d, i) {
                return (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i], flexShrink: 0 }}/>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', flex: 1 }}>{d.name.length > 20 ? d.name.slice(0,20) + '…' : d.name}</p>
                    <p style={{ fontSize: '11px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{d.value}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Overdue patients</p>
            <Link href="/dashboard/records" style={{ fontSize: '11px', color: '#534AB7', textDecoration: 'none' }}>View all →</Link>
          </div>
          {overduePatients.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '24px', textAlign: 'center' }}>No overdue patients</p>
          ) : (
            overduePatients.map(function(p, i) {
              const [bg, color] = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const initials = p.name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0,2)
              return (
                <Link key={p.id} href={'/dashboard/patients/' + p.id} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>{p.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{p.treatment}{p.toothRef ? ' · Tooth ' + p.toothRef : ''}</p>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#FCEBEB', color: '#A32D2D', fontWeight: '500', flexShrink: 0 }}>{p.daysSince}d</span>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* Line chart */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Revenue vs expenses — last 6 months</p>
          <Link href="/dashboard/finance" style={{ fontSize: '11px', color: '#534AB7', textDecoration: 'none' }}>Finance →</Link>
        </div>
        <LineChart months={months} revenueByMonth={revenueByMonth} expByMonth={expByMonth} />
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '3px', background: '#1D9E75', borderRadius: '2px' }}/>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Revenue</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '0', borderTop: '2px dashed #E24B4A' }}/>
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Expenses</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '12px' }}>Quick actions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '10px' }}>
          {[
            { icon: '📅', label: 'Book appointment', bg: '#E1F5EE', href: '/dashboard/appointments' },
            { icon: '👤', label: 'New patient', bg: '#EEEDFE', href: '/dashboard/patients' },
            { icon: '💸', label: 'Add expense', bg: '#FAEEDA', href: '/dashboard/expenses' },
            { icon: '🔁', label: 'Send follow up', bg: '#E6F1FB', href: '/dashboard/notifications' },
{ icon: '⭐', label: 'Seek review', bg: '#FFF7ED', href: '/dashboard/notifications' },
          ].map(function(item) {
            const style = {
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '14px 10px', borderRadius: '12px', border: '0.5px solid var(--color-border-tertiary)',
              background: 'var(--color-background-secondary)', cursor: 'pointer', textDecoration: 'none',
              textAlign: 'center',
            }
            const inner = (
              <>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{item.icon}</div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: '500', lineHeight: 1.3 }}>{item.label}</p>
              </>
            )
            return item.href ? (
              <Link key={item.label} href={item.href} style={style}>{inner}</Link>
            ) : (
              <div key={item.label} style={style} onClick={item.action}>{inner}</div>
            )
          })}
        </div>
      </div>

    </div>
  )
}