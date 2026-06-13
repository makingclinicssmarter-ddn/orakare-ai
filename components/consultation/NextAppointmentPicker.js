'use client'

// Simple next-appointment picker — date + optional time slot.
// Creates an Appointment row when the visit is closed (the API handles it).
// We don't link to the existing calendar/appointment management here — that
// can be done later from the Appointments page. For now, "schedule" = "save
// the date Dr. Shobhna gave the patient".

const SLOT_PRESETS = ['10:00 AM', '11:00 AM', '12:00 PM', '04:00 PM', '05:00 PM', '06:00 PM']

export default function NextAppointmentPicker({ value, onChange }) {
  const enabled = !!value

  function toggle() {
    if (enabled) {
      onChange(null)
    } else {
      // Default: 7 days from now
      const d = new Date()
      d.setDate(d.getDate() + 7)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      onChange({ date: yyyy + '-' + mm + '-' + dd, slot: null })
    }
  }

  function setDate(s) {
    onChange({ ...(value || {}), date: s })
  }

  function setSlot(s) {
    onChange({ ...(value || {}), slot: s })
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">Next appointment</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={toggle}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
          />
          Schedule one
        </label>
      </div>

      {enabled && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={value.date || ''}
              onChange={function(e) { setDate(e.target.value) }}
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Time (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_PRESETS.map(function(s) {
                const sel = value.slot === s
                return (
                  <button
                    key={s}
                    onClick={function() { setSlot(s) }}
                    className={
                      'text-xs px-2.5 py-1 rounded-full border ' +
                      (sel ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')
                    }
                  >
                    {s}
                  </button>
                )
              })}
              <input
                type="text"
                value={value.slot || ''}
                onChange={function(e) { setSlot(e.target.value) }}
                placeholder="or type"
                className="text-xs px-2.5 py-1 rounded border border-slate-200 w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
