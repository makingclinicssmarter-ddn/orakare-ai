/**
 * Google Calendar API client.
 *
 * Authenticates via a Google Cloud service account using the JWT flow.
 * Reads from env vars:
 *   - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *   - GOOGLE_CALENDAR_ID
 *
 * Read-only for Push #12. Write methods (createEvent, updateEvent, deleteEvent)
 * are stubbed but throw — they'll be enabled in Push #13+ once we add
 * two-way sync and have a "Make changes to events" permission on the calendar.
 */

import { google } from 'googleapis'

// Vercel env vars often store multi-line private keys with literal "\n" chars.
// We restore real newlines on read.
function getPrivateKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ''
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not set')
  // Replace literal \n with real newlines if needed
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw
}

let cachedClient = null

function getCalendarClient() {
  if (cachedClient) return cachedClient

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  if (!email) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL not set')

  const auth = new google.auth.JWT({
    email,
    key: getPrivateKey(),
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  })

  cachedClient = google.calendar({ version: 'v3', auth })
  return cachedClient
}

/**
 * List events from the configured calendar, optionally bounded by date range.
 * Returns the raw event objects from Google's API.
 *
 * @param {Object} opts
 * @param {Date}   opts.timeMin  earliest event start (defaults to 30 days ago)
 * @param {Date}   opts.timeMax  latest event start  (defaults to 90 days ahead)
 * @param {Number} opts.maxResults  cap on events returned (defaults to 250)
 */
export async function listEvents(opts) {
  opts = opts || {}
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not set')

  const now = new Date()
  const timeMin = opts.timeMin || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const timeMax = opts.timeMax || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const maxResults = opts.maxResults || 250

  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
    // Include cancelled events too — we use them to mark Appointments CANCELLED
    showDeleted: true,
  })

  return res.data.items || []
}

/**
 * Get a single event by ID. Returns null if not found / deleted.
 */
export async function getEvent(eventId) {
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not set')

  try {
    const res = await calendar.events.get({ calendarId, eventId })
    return res.data
  } catch (e) {
    if (e && e.code === 404) return null
    throw e
  }
}

// Write stubs — enable in Push #13+
export async function createEvent() {
  throw new Error('Write support not yet enabled. Push #13 will add it.')
}
export async function updateEvent() {
  throw new Error('Write support not yet enabled. Push #13 will add it.')
}
export async function deleteEvent() {
  throw new Error('Write support not yet enabled. Push #13 will add it.')
}
