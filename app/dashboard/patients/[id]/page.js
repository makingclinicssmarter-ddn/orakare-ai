import Link from 'next/link'
import { db } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import PatientHistoryActions from '@/components/patients/PatientHistoryActions'
import UnresolvedVisitBanner from '@/components/visits/UnresolvedVisitBanner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VISIT_STATUS_LABEL = {
  REGISTERED: 'Registered',
  HISTORY_TAKEN: 'History taken',
  EXAM_CONSENT_SIGNED: 'Exam consent signed',
  EXAMINATION_DONE: 'Examination done',
  DIAGNOSIS_DONE: 'Diagnosis done',
  TREATMENT_PLANNED: 'Treatment planned',
  TREATMENT_CONSENT_SIGNED: 'Treatment consent signed',
  COMPLETED: 'Completed',
}

// VisitOutcome labels — only set on visits closed via the new Close-visit screen (Push #3).
const VISIT_OUTCOME_LABEL = {
  ADVISED: 'Advised',
  CONSENTED: 'Consented, deferred',
  TREATED: 'Consented & treated',
}

const VISIT_OUTCOME_TONE = {
  ADVISED: 'bg-amber-50 text-amber-800 border-amber-200',
  CONSENTED: 'bg-blue-50 text-blue-800 border-blue-200',
  TREATED: 'bg-green-50 text-green-800 border-green-200',
}

const TREATMENT_STATUS_TONE = {
  PLANNED: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-800 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-800 border-green-200',
  ON_HOLD: 'bg-amber-50 text-amber-800 border-amber-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

function formatINR(n) {
  return '₹' + (n || 0).toLocaleString('en-IN')
}

// All dates in OraKare are normalized to UTC in the database. For display we
// explicitly format in Asia/Kolkata so a treatment recorded at 11 PM IST shows
// as that IST date — never the UTC date one before. Without timeZone set,
// Node on Vercel formats in UTC, drifting late-evening events back a day.
const IST = 'Asia/Kolkata'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST })
}

function formatDateTime(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST }) +
    ' · ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST })
}

function titleCase(s) {
  if (!s) return ''
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase() })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PatientRecordsPage(props) {
  const params = await props.params
  const id = params.id
  if (!id) notFound()

  const { clinicId } = await getDoctorContext()
  if (!clinicId) redirect('/sign-in')

  // Single query pulls the full record graph for this patient.
  // Includes are nested so the JS code can group cleanly afterwards.
  const patient = await db.patient.findFirst({
    where: { id, clinicId },
    include: {
      visits: {
        orderBy: { createdAt: 'desc' },
        include: {
          medicalHistory: true,
          treatmentPlan: {
            include: {
              treatmentItems: {
                include: { treatment: true },
              },
            },
          },
        },
      },
      treatments: {
        orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          consultant: { select: { id: true, name: true } },
          treatmentItem: {
            include: {
              sittings: {
                orderBy: { date: 'asc' },
              },
            },
          },
        },
      },
      invoices: {
        orderBy: { date: 'desc' },
        include: { items: true },
        take: 100,
      },
      receipts: {
        orderBy: { date: 'desc' },
        include: { allocations: true },
        take: 100,
      },
    },
  })

  if (!patient) notFound()

  // ── Categorise data ────────────────────────────────────────────────────────

  const inProgressVisit = patient.visits.find(function(v) { return v.status !== 'COMPLETED' })
  const isArchived = !!patient.archivedAt

  // Push #3: visits that started but never reached the Close-visit screen.
  // Day 1 ships the banner only; closing the visit lands on Day 3-4.
  // Until then, the banner exists but the Close screen route 404s — that's
  // fine because no NEW visits trigger this yet (only ones started after this
  // ships and not closed via the new flow).
  const unresolvedVisits = patient.visits
    .filter(function(v) { return v.needsResolution === true && v.status !== 'COMPLETED' })
    .map(function(v) { return { id: v.id, status: v.status, createdAt: v.createdAt } })

  // Treatments are the spine of the records page (mirrors her Google Sheet).
  // Each treatment may or may not have an associated TreatmentItem (older
  // treatments imported pre-treatmentItem may not). Each TreatmentItem holds
  // the sittings.
  const treatments = patient.treatments || []

  // "Planned but not started" — treatment items with SIGNED consent but no
  // Treatment row yet, OR Treatment row in PLANNED status.
  // We surface these so Dr. Shobhna sees what she's committed to.
  const allTreatmentItems = patient.visits
    .flatMap(function(v) { return v.treatmentPlan?.treatmentItems || [] })

  const plannedNotStarted = allTreatmentItems.filter(function(ti) {
    return ti.consentStatus === 'SIGNED' && !ti.treatment
  })

  // Receipts allocated to a treatment we have; standalone if not.
  const treatmentIdSet = new Set(treatments.map(function(t) { return t.id }))
  const standaloneReceipts = patient.receipts.filter(function(r) {
    if (!r.allocations || r.allocations.length === 0) return true
    return !r.allocations.some(function(a) { return treatmentIdSet.has(a.treatmentId) })
  })

  // Visits without any consented treatment — purely consultative.
  const consultationOnlyVisits = patient.visits.filter(function(v) {
    const items = v.treatmentPlan?.treatmentItems || []
    return items.length === 0 || items.every(function(ti) { return ti.consentStatus !== 'SIGNED' })
  })

  // ── Financials ──────────────────────────────────────────────────────────────

  const totalEstimate = treatments.reduce(function(s, t) { return s + (t.estimate || 0) - (t.discount || 0) }, 0)
  const plannedEstimate = plannedNotStarted.reduce(function(s, ti) { return s + (ti.estimatedCost || 0) }, 0)
  const totalInvoiced = patient.invoices.reduce(function(s, inv) { return s + (inv.total || 0) }, 0)
  const totalCollected = patient.receipts.reduce(function(s, r) { return s + (r.amount || 0) }, 0)
  const billingBasis = Math.max(totalEstimate + plannedEstimate, totalInvoiced)
  const pendingDues = Math.max(0, billingBasis - totalCollected)
  const creditBalance = Math.max(0, totalCollected - billingBasis)

  // Per-treatment paid (sum of sitting.paid for that treatment's item)
  const treatmentPaidMap = {}
  treatments.forEach(function(t) {
    const sittings = t.treatmentItem?.sittings || []
    treatmentPaidMap[t.id] = sittings.reduce(function(s, st) { return s + (st.paid || 0) }, 0)
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard/patients" className="text-sm text-slate-400 hover:text-slate-600">
        ← Back to patients
      </Link>

      {/* Header */}
      <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-medium text-slate-900">{patient.name}</h1>
            {isArchived && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Archived
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {patient.age}y · {patient.gender} · {patient.mobile}
            {patient.originalID ? ' · ' + patient.originalID : ''}
            {patient.abhaId ? ' · ABHA ' + patient.abhaId : ''}
          </p>
        </div>

        <PatientHistoryActions
          patientId={patient.id}
          isArchived={isArchived}
          hasInProgressVisit={!!inProgressVisit}
          inProgressVisitId={inProgressVisit?.id}
        />
      </div>

      {isArchived && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This patient is archived. Archived patients don't appear in consultation search.
          Use the actions menu above to unarchive.
        </div>
      )}

      <UnresolvedVisitBanner patientId={patient.id} unresolvedVisits={unresolvedVisits} />

      {inProgressVisit && !isArchived && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-indigo-900">Consultation in progress</div>
            <div className="text-xs text-indigo-700 mt-0.5">
              Started {formatDate(inProgressVisit.createdAt)} · Status: {VISIT_STATUS_LABEL[inProgressVisit.status] || inProgressVisit.status}
            </div>
          </div>
          <Link
            href={'/dashboard/consultation/' + patient.id + '/' + inProgressVisit.id + '/start'}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Resume →
          </Link>
        </div>
      )}

      {/* Financial summary */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Treatments estimate</div>
          <div className="text-lg font-medium text-slate-900 mt-1">{formatINR(totalEstimate + plannedEstimate)}</div>
          {plannedEstimate > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5">incl. {formatINR(plannedEstimate)} planned</div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Invoiced</div>
          <div className="text-lg font-medium text-slate-900 mt-1">{formatINR(totalInvoiced)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Collected</div>
          <div className="text-lg font-medium text-green-700 mt-1">{formatINR(totalCollected)}</div>
        </div>
        <div className={'rounded-xl border p-4 ' + (pendingDues > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200')}>
          <div className={'text-xs ' + (pendingDues > 0 ? 'text-red-700' : 'text-slate-500')}>
            {creditBalance > 0 ? 'Credit balance' : 'Pending dues'}
          </div>
          <div className={'text-lg font-medium mt-1 ' + (pendingDues > 0 ? 'text-red-700' : 'text-slate-900')}>
            {formatINR(creditBalance > 0 ? creditBalance : pendingDues)}
          </div>
        </div>
      </div>

      {/* Treatments — the spine of the record */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-slate-700 mb-3">Treatments</h2>

        {treatments.length === 0 && plannedNotStarted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            No treatments recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {treatments.map(function(t) {
              const sittings = t.treatmentItem?.sittings || []
              const expectedSittings = t.expectedSittings || sittings.length
              const paidForThisTreatment = treatmentPaidMap[t.id] || 0
              const netEstimate = (t.estimate || 0) - (t.discount || 0)
              const balance = Math.max(0, netEstimate - paidForThisTreatment)
              const tone = TREATMENT_STATUS_TONE[t.status] || TREATMENT_STATUS_TONE.PLANNED
              const defaultOpen = t.status !== 'COMPLETED' && t.status !== 'CANCELLED'

              return (
                <details
                  key={t.id}
                  open={defaultOpen}
                  className="bg-white rounded-xl border border-slate-200 group"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-start justify-between gap-3 flex-wrap hover:bg-slate-50 transition rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900">{t.type}</span>
                        {t.area && (
                          <span className="text-xs text-slate-500">· {t.area}</span>
                        )}
                        <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium border ' + tone}>
                          {titleCase(t.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {t.startedAt ? 'Started ' + formatDate(t.startedAt) : 'Not started'}
                        {t.completedAt ? ' · Completed ' + formatDate(t.completedAt) : ''}
                        {t.consultant?.name ? ' · Dr. ' + t.consultant.name : ''}
                        {' · '}{sittings.length}/{expectedSittings} sittings
                      </div>
                      {t.notes && (
                        <div className="text-xs text-slate-600 mt-1 italic">{t.notes}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium text-slate-900">{formatINR(netEstimate)}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Paid {formatINR(paidForThisTreatment)}
                        {balance > 0 && <span className="text-red-600"> · Bal {formatINR(balance)}</span>}
                      </div>
                    </div>
                    <span className="ml-2 text-slate-400 text-xs transition group-open:rotate-90">▶</span>
                  </summary>

                  {/* Nested sittings */}
                  <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                    {sittings.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No sittings recorded yet</p>
                    ) : (
                      sittings.map(function(s, idx) {
                        const consumables = Array.isArray(s.consumables) ? s.consumables : []
                        return (
                          <div key={s.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-slate-700">
                                  Sitting {idx + 1} · {formatDateTime(s.date)}
                                </div>
                                {(s.description || s.notes) && (
                                  <div className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">
                                    {s.description || s.notes}
                                  </div>
                                )}
                                {s.prescription && (
                                  <div className="text-xs text-slate-600 mt-1">
                                    <span className="text-slate-400">Rx: </span>
                                    {s.prescription}
                                  </div>
                                )}
                                {consumables.length > 0 && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    <span className="text-slate-400">Consumables: </span>
                                    {consumables.map(function(c, ci) {
                                      return (typeof c === 'string') ? c : (c.name || c.item || '')
                                    }).filter(Boolean).join(', ')}
                                    {s.consumablesTotal ? ' · ' + formatINR(s.consumablesTotal) : ''}
                                  </div>
                                )}
                              </div>
                              {(s.paid || 0) > 0 && (
                                <div className="text-right shrink-0">
                                  <div className="text-sm font-medium text-green-700">+ {formatINR(s.paid)}</div>
                                  {s.payMode && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">{s.payMode}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </details>
              )
            })}

            {/* Planned-but-not-started treatments */}
            {plannedNotStarted.map(function(ti) {
              return (
                <div key={ti.id} className="bg-white rounded-xl border border-dashed border-slate-300 px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-700">{ti.procedureName}</span>
                        {ti.toothRef && (
                          <span className="text-xs text-slate-500">· {ti.toothRef}</span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Planned (consent signed)
                        </span>
                      </div>
                      {ti.estimatedSessions && (
                        <div className="text-xs text-slate-500 mt-1">
                          Est. {ti.estimatedSessions} sittings
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-slate-700 shrink-0">{formatINR(ti.estimatedCost)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Other activity — consultation-only visits + standalone receipts + standalone invoices */}
      {(consultationOnlyVisits.length > 0 || standaloneReceipts.length > 0 || patient.invoices.length > 0) && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-slate-700 mb-3">Other activity</h2>
          <div className="space-y-2">
            {consultationOnlyVisits.map(function(v) {
              const isCompleted = v.status === 'COMPLETED'
              const hasOutcome = !!v.outcome
              const outcomeLabel = hasOutcome ? VISIT_OUTCOME_LABEL[v.outcome] : null
              const outcomeTone = hasOutcome ? VISIT_OUTCOME_TONE[v.outcome] : null

              const body = (
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-700">Visit</span>
                      {hasOutcome ? (
                        <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium border ' + (outcomeTone || 'bg-slate-100 text-slate-700 border-slate-200')}>
                          {outcomeLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                          {VISIT_STATUS_LABEL[v.status] || v.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {v.medicalHistory?.chiefComplaint || (hasOutcome ? '' : 'No clinical record')}
                    </div>
                    {v.advice && (
                      <div className="text-xs text-slate-600 mt-1">
                        <span className="text-slate-400">Advice: </span>{v.advice}
                      </div>
                    )}
                    {v.nextAppointmentDate && (
                      <div className="text-xs text-slate-500 mt-1">
                        <span className="text-slate-400">Next appt: </span>{formatDate(v.nextAppointmentDate)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{formatDate(v.createdAt)}</div>
                </div>
              )

              // COMPLETED visits — render as static card (Day 5 will link to prescription slip).
              // Non-COMPLETED visits — render as Link to resume (Close screen if needsResolution=true, otherwise old consultation flow).
              if (isCompleted) {
                return (
                  <div key={'visit-' + v.id} className="block bg-white rounded-lg border border-slate-200 px-4 py-3">
                    {body}
                  </div>
                )
              }
              const href = v.needsResolution
                ? '/dashboard/consultation/' + patient.id + '/' + v.id + '/close'
                : '/dashboard/consultation/' + patient.id + '/' + v.id + '/start'
              return (
                <Link
                  key={'visit-' + v.id}
                  href={href}
                  className="block bg-white rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 transition"
                >
                  {body}
                </Link>
              )
            })}

            {patient.invoices.map(function(inv) {
              return (
                <a
                  key={'inv-' + inv.id}
                  href={'/api/invoice-print/' + inv.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Invoice {inv.invoiceNo}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {(inv.items || []).map(function(it) { return it.description }).filter(Boolean).join(', ') || 'Invoice'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">{formatINR(inv.total)}</div>
                      <div className="text-xs text-slate-400">{formatDate(inv.date)}</div>
                    </div>
                  </div>
                </a>
              )
            })}

            {standaloneReceipts.map(function(r) {
              return (
                <div key={'rec-' + r.id} className="bg-white rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Receipt</div>
                      <div className="text-xs text-slate-500 mt-0.5">{r.notes || 'Payment received'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-700">+ {formatINR(r.amount)}</div>
                      <div className="text-xs text-slate-400">
                        {formatDate(r.date)}{r.paymentMode ? ' · ' + r.paymentMode : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
