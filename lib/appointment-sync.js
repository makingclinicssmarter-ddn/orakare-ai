/**
 * Appointment sync engine.
 *
 * Pulls events from the configured Google Calendar, parses them into
 * structured appointment data, and upserts them into the OraKare
 * Appointment table.
 *
 * Source detection:
 *   - Description contains "Booked via orakaredentalclinic.com" → WEBSITE
 *   - extendedProperties.private.source === "orakare"            → ORAKARE (future)
 *   - Otherwise                                                   → EXTERNAL
 *
 * Patient auto-linking:
 *   When a phone number is extracted from the description, we normalize
 *   it to last-10-digits and look up Patient by phone. If a match exists
 *   in this clinic, link the appointment to that patient.
 *
 * Cancellation handling:
 *   Events that come back from Calendar with status === 'cancelled' are
 *   matched against existing Appointment rows by calendarEventId and the
 *   Appointment.status is set to CANCELLED (the row is preserved for audit).
 */

import { db } from '@/lib/db'
import { listEvents } from '@/lib/google-calendar'
import { normalizePhone } from '@/lib/phone-normalize'

const WEBSITE_MARKER = 'Booked via orakaredentalclinic.com'

/**
 * Parse a Google Calendar event into a normalized appointment payload.
 * Returns null if the event can't be parsed (e.g. cancelled without prior data).
 */
function parseEvent(event) {
  if (!event || !event.id) return null

  const title = event.summary || ''
  const description = event.description || ''
  const startObj = event.start || {}
  const startIso = startObj.dateTime || startObj.date
  if (!startIso) return null  // events without a start time can't be appointments

  // ─── Source detection ─────────────────────────────────────────────────
  let source = 'EXTERNAL'
  const orakareTag = event.extendedProperties && event.extendedProperties.private && event.extendedProperties.private.source
  if (orakareTag === 'orakare') source = 'ORAKARE'
  else if (description.includes(WEBSITE_MARKER)) source = 'WEBSITE'

  // ─── Title parsing ────────────────────────────────────────────────────
  // Website pattern: "🦷 {Patient Name} — {Service}"
  // Could also be "{Patient} — {Service}" or just "{Patient}" for external events.
  // Strip leading emoji & whitespace.
  const cleanedTitle = title.replace(/^[^\w\d\s]+/, '').trim()  // drop leading emoji
  let nameFromTitle = cleanedTitle
  let serviceFromTitle = null
  const dashSplit = cleanedTitle.split(/—|–|-/)  // em-dash, en-dash, hyphen
  if (dashSplit.length >= 2) {
    nameFromTitle = dashSplit[0].trim()
    serviceFromTitle = dashSplit.slice(1).join('-').trim()
  }

  // ─── Description parsing ──────────────────────────────────────────────
  // For website events, description has structured lines:
  //   Patient : ...
  //   Phone : ...
  //   Email : ...
  //   Service : ...
  //   Notes : ...
  //   Booked via orakaredentalclinic.com
  // We extract each by regex; for external events, these are mostly null
  // and we fall back to title for name.
  function extractField(label) {
    const re = new RegExp('^\\s*' + label + '\\s*:\\s*(.+)$', 'mi')
    const m = description.match(re)
    return m ? m[1].trim() : null
  }

  const name = extractField('Patient') || nameFromTitle || '(Unknown)'
  const phone = extractField('Phone')
  const email = extractField('Email')
  const service = extractField('Service') || serviceFromTitle
  const notes = extractField('Notes')

  return {
    calendarEventId: event.id,
    name,
    phone,
    email,
    service,
    notes,
    date: new Date(startIso),
    source,
    cancelled: event.status === 'cancelled',
  }
}

/**
 * Look up a Patient by normalized phone match within a clinic.
 * Returns patientId or null.
 */
async function findPatientByPhone(clinicId, phone) {
  if (!phone) return null
  const normalized = normalizePhone(phone)
  if (!normalized) return null

  // Search all patients in clinic — we have to match on suffix since
  // Patient.mobile may have country code variations.
  const candidates = await db.patient.findMany({
    where: {
      clinicId,
      OR: [
        { mobile: { contains: normalized } },
        { mobile: { endsWith: normalized } },
      ],
    },
    select: { id: true, mobile: true },
  })

  // Filter to true matches (last 10 digits equal)
  const match = candidates.find(function(p) { return normalizePhone(p.mobile) === normalized })
  return match ? match.id : null
}

/**
 * Sync all events from the configured calendar into the Appointment table
 * for a given clinic. Returns a summary { created, updated, cancelled, skipped }.
 */
export async function syncCalendarForClinic(clinicId) {
  const summary = { fetched: 0, created: 0, updated: 0, cancelled: 0, skipped: 0, errors: 0 }

  let events
  try {
    events = await listEvents()
  } catch (e) {
    summary.errors++
    summary.errorMessage = e.message || 'Failed to list events'
    return summary
  }

  summary.fetched = events.length

  for (const event of events) {
    try {
      const parsed = parseEvent(event)
      if (!parsed) { summary.skipped++; continue }

      const existing = await db.appointment.findFirst({
        where: { clinicId, calendarEventId: parsed.calendarEventId },
        select: { id: true, status: true },
      })

      if (parsed.cancelled) {
        // Event was deleted/cancelled in Calendar
        if (existing && existing.status !== 'CANCELLED') {
          await db.appointment.update({
            where: { id: existing.id },
            data: { status: 'CANCELLED', syncedAt: new Date() },
          })
          summary.cancelled++
        } else {
          summary.skipped++
        }
        continue
      }

      const patientId = await findPatientByPhone(clinicId, parsed.phone)

      const data = {
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        service: parsed.service,
        notes: parsed.notes,
        date: parsed.date,
        source: parsed.source,
        patientId,
        syncedAt: new Date(),
      }

      if (existing) {
        await db.appointment.update({
          where: { id: existing.id },
          data,
        })
        summary.updated++
      } else {
        await db.appointment.create({
          data: {
            ...data,
            clinicId,
            calendarEventId: parsed.calendarEventId,
            status: 'SCHEDULED',
          },
        })
        summary.created++
      }
    } catch (e) {
      summary.errors++
      // eslint-disable-next-line no-console
      console.error('Sync error for event', event.id, e.message)
    }
  }

  return summary
}

/**
 * Sync all configured clinics. For Push #12 we have only one clinic, but
 * the loop is here so multi-clinic just works.
 */
export async function syncAllClinics() {
  const clinics = await db.clinic.findMany({ select: { id: true, name: true } })
  const results = []
  for (const c of clinics) {
    const summary = await syncCalendarForClinic(c.id)
    results.push({ clinicId: c.id, name: c.name, ...summary })
  }
  return results
}
