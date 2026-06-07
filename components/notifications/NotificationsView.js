'use client'

import { useState } from 'react'



function buildMsg(type, name, data, lang) {
  const first = (name || '').split(' ')[0]
  const doctor = 'Dr. Shobhna Bansal'

  if (type === 'appointment') {
    return lang === 'hindi'
      ? `नमस्ते ${first} जी 🙏\nआपकी ${doctor} की क्लिनिक में आज ${data.slot} बजे अपॉइंटमेंट है${data.service ? ' (' + data.service + ')' : ''}।\nकृपया समय पर पधारें।\nधन्यवाद 😊`
      : `Hello ${first},\nThis is a reminder for your appointment with ${doctor} today at ${data.slot}${data.service ? ' (' + data.service + ')' : ''}.\nPlease be on time. Thank you!`
  }

  if (type === 'followup') {
    return lang === 'hindi'
      ? `नमस्ते ${first} जी 🙏\nकल की विज़िट के बाद उम्मीद है आप अच्छा महसूस कर रहे हैं।\nकोई भी तकलीफ हो तो बेझिझक बताएं — हम यहाँ हैं।\n- ${doctor}`
      : `Hello ${first},\nHope you are feeling comfortable after yesterday's visit.\nDo reach out if you have any discomfort — we are here to help.\n- ${doctor}`
  }

  if (type === 'checkin') {
    return lang === 'hindi'
      ? `नमस्ते ${first} जी 🙏\nआपसे कुछ समय से मुलाक़ात नहीं हुई। उम्मीद है सब ठीक है।\nजब भी आपकी अगली अपॉइंटमेंट करानी हो, हमें बताएं।\n- ${doctor}`
      : `Hello ${first},\nIt has been a while since your last visit. Hope all is well.\nWhenever you are ready for your next appointment, feel free to reach out.\n- ${doctor}`
  }

  if (type === 'overdue') {
    return lang === 'hindi'
      ? `नमस्ते ${first} जी 🙏\nआशा है आप स्वस्थ हैं। काफी समय से आपकी विज़िट नहीं हुई।\nदाँतों की नियमित जाँच ज़रूरी होती है — जब भी समय हो, अपॉइंटमेंट ले लें।\nध्यान रखें 🦷\n- ${doctor}`
      : `Hello ${first},\nHope you are keeping well. It has been a while since your last dental visit.\nRegular check-ups help maintain good oral health — do book an appointment when convenient.\nTake care 🦷\n- ${doctor}`
  }

  if (type === 'review') {
    return lang === 'hindi'
      ? `नमस्ते ${first} जी 🙏\nआशा है कि ${data.clinic} में आपका अनुभव अच्छा रहा।\nकृपया यहाँ अपना फीडबैक दें:\n${data.reviewUrl || ''}\nधन्यवाद 🙏\n- ${doctor}`
      : `Hello ${first},\nIt was lovely to see you. We hope your experience was comfortable.\nIf you would like to share your feedback, we would really appreciate it:\n${data.reviewUrl || ''}\nThank you 🙏\n- ${doctor}`
  }

  return ''
}

function buildWAUrl(phone, message) {
  const clean = (phone || '').replace(/\D/g, '').slice(-10)
  if (!clean) return null
  return 'https://wa.me/91' + clean + '?text=' + encodeURIComponent(message)
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(function() {})
}

function PatientCard({ name, phone, mobile, detail, message, lang }) {
  const [copied, setCopied] = useState(false)
  const ph = phone || mobile || ''
  const waUrl = buildWAUrl(ph, message)
  const initials = (name || '?').split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0, 2)

  function handleCopy() {
    copyToClipboard(message)
    setCopied(true)
    setTimeout(function() { setCopied(false) }, 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
          <div className="mt-2 bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 whitespace-pre-line leading-relaxed">
            {message}
          </div>
          <div className="flex gap-2 mt-2">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                style={{ background: '#25D366' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send on WhatsApp
              </a>
            ) : (
              <span className="text-xs text-gray-400 px-3 py-1.5">No phone number</span>
            )}
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
            >
              {copied ? 'Copied!' : 'Copy message'}
            </button>
            {ph && (
              <a
                href={'tel:' + ph}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                📞 Call
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, count, children, emptyMsg }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={function() { setOpen(function(p) { return !p }) }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-gray-900">{title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">{count}</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-3">
          {count === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">{emptyMsg}</p>
          ) : children}
        </div>
      )}
    </div>
  )
}

export default function NotificationsView({
  clinicName, googleReviewUrl, todayAppointments, yesterdaySittings,
  checkinPatients, overduePatients, reviewPatients
}) {
  const [lang, setLang] = useState('hindi')

  const totalCount = todayAppointments.length + yesterdaySittings.length + checkinPatients.length + overduePatients.length + reviewPatients.length

  return (
    <div className="space-y-4">

      {/* Header controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-gray-600">{totalCount} patient{totalCount !== 1 ? 's' : ''} need attention today</p>
          </div>
          <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={function() { setLang('hindi') }}
              className="px-4 py-2 text-xs font-medium transition"
              style={{ background: lang === 'hindi' ? '#0f6e56' : '#fff', color: lang === 'hindi' ? '#fff' : '#6b7280' }}
            >
              🇮🇳 Hindi
            </button>
            <button
              onClick={function() { setLang('english') }}
              className="px-4 py-2 text-xs font-medium transition"
              style={{ background: lang === 'english' ? '#0f6e56' : '#fff', color: lang === 'english' ? '#fff' : '#6b7280' }}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>

      {/* Today's appointments */}
      <Section title="Today's appointments" icon="📅" count={todayAppointments.length} emptyMsg="No appointments today">
        {todayAppointments.map(function(appt) {
          const slot = appt.slot || '—'
          const msg = buildMsg('appointment', appt.name, { clinic: clinicName, slot, service: appt.service }, lang)
          return (
            <PatientCard
              key={appt.id}
              name={appt.name}
              phone={appt.phone}
              detail={'Today at ' + slot + (appt.service ? ' · ' + appt.service : '')}
              message={msg}
              lang={lang}
            />
          )
        })}
      </Section>

      {/* Yesterday's follow ups */}
      <Section title="Follow up — yesterday's patients" icon="🔁" count={yesterdaySittings.length} emptyMsg="No sittings recorded yesterday">
        {yesterdaySittings.map(function(sitting) {
          const patient = sitting.patient
          if (!patient) return null
          const msg = buildMsg('followup', patient.name, { clinic: clinicName }, lang)
          return (
            <PatientCard
              key={sitting.id}
              name={patient.name}
              mobile={patient.mobile}
              detail={'Sitting yesterday · ' + (sitting.description || '')}
              message={msg}
              lang={lang}
            />
          )
        })}
      </Section>

      {/* Active treatment check-ins */}
      <Section title="Treatment check-in — not seen in 7+ days" icon="🦷" count={checkinPatients.length} emptyMsg="All active patients seen recently">
        {checkinPatients.map(function(item) {
          const msg = buildMsg('checkin', item.patient.name, { clinic: clinicName, treatment: item.treatment, days: item.daysSince }, lang)
          return (
            <PatientCard
              key={item.patient.id}
              name={item.patient.name}
              mobile={item.patient.mobile}
              detail={item.treatment + ' · ' + item.daysSince + ' days since last visit'}
              message={msg}
              lang={lang}
            />
          )
        })}
      </Section>

      {/* Overdue patients */}
      <Section title="Overdue — not seen in 60+ days" icon="⚠️" count={overduePatients.length} emptyMsg="No overdue patients">
        {overduePatients.map(function(item) {
          const msg = buildMsg('overdue', item.patient.name, { clinic: clinicName, treatment: item.treatment, days: item.daysSince }, lang)
          return (
            <PatientCard
              key={item.patient.id}
              name={item.patient.name}
              mobile={item.patient.mobile}
              detail={item.treatment + ' · ' + item.daysSince + ' days since last visit'}
              message={msg}
              lang={lang}
            />
          )
        })}
      </Section>

      {/* Google review requests */}
      <Section title="Seek Google review — visited 3–7 days ago" icon="⭐" count={reviewPatients.length} emptyMsg="No patients eligible for review request">
        {reviewPatients.map(function(item) {
          const msg = buildMsg('review', item.patient.name, { clinic: clinicName, reviewUrl: googleReviewUrl }, lang)
          return (
            <PatientCard
              key={item.patient.id}
              name={item.patient.name}
              mobile={item.patient.mobile}
              detail={'Visited ' + new Date(item.sittingDate).toLocaleDateString('en-IN')}
              message={msg}
              lang={lang}
            />
          )
        })}
      </Section>

    </div>
  )
}