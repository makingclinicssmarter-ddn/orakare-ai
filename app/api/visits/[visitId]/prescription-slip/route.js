import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden, notFoundResponse } from '@/lib/auth-helpers'

// GET /api/visits/[visitId]/prescription-slip
// Returns an HTML response — a printable A5 prescription slip for this visit.
// Used by clicking "Print slip" on the Records page's visit card.
//
// Includes:
//   - Clinic header (name, doctor, qualification, regNo, address)
//   - Patient identification (name, age, gender, mobile, ORK-ID)
//   - Visit date + time
//   - Findings (selectively — chief complaint + clinical notes)
//   - Treatments planned or started
//   - Advice text
//   - Medications (from inventory items dispensed at close)
//   - Next appointment
// EXCLUDES: charges, totals, payment received (per Dr. Shobhna's spec —
// invoice is a separate document).

const IST = 'Asia/Kolkata'

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: IST,
  })
}
function fmtDateTime(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: IST,
  })
}

function esc(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET(_req, props) {
  const params = await props.params
  const visitId = params.visitId

  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const visit = await db.visit.findFirst({
    where: { id: visitId, clinicId: ctx.clinicId },
    include: {
      patient: { select: { name: true, age: true, gender: true, mobile: true, originalID: true } },
      doctor: { select: { name: true, qualification: true } },
      clinic: { select: { name: true, address: true, phone: true, regNo: true } },
      medicalHistory: { select: { chiefComplaint: true } },
      clinicalFindings: { select: { clinicalNotes: true, clinicalFindings: true, radiographicalFindings: true } },
      treatmentPlan: {
        include: {
          treatmentItems: {
            select: { procedureName: true, toothRef: true, consentStatus: true },
          },
        },
      },
    },
  })
  if (!visit) return notFoundResponse()

  // Pull invoice items linked to this visit (close-visit invoice) for medication list.
  // Invoice for this visit is the most recent VISIT_CHARGES invoice for this patient
  // created within 30 seconds of the visit being marked COMPLETED.
  // Conservative: filter where notes match this visit's outcome marker.
  const recentInvoice = await db.invoice.findFirst({
    where: {
      clinicId: ctx.clinicId,
      patientId: visit.patientId,
      kind: 'VISIT_CHARGES',
      notes: { contains: 'Visit closed — outcome:' },
    },
    include: { items: { select: { description: true, quantity: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const medicationLines = (recentInvoice?.items || [])
    .filter(function(i) {
      // Heuristic: skip consultation/X-ray/scaling/etc. — only dispensed items
      const d = (i.description || '').toLowerCase()
      return !/consult|x-ray|opg|periapical|bitewing|cbct|scaling|polish|dressing|suture|extraction/.test(d)
    })
    .map(function(i) { return { name: i.description, qty: i.quantity } })

  const plannedTreatments = (visit.treatmentPlan?.treatmentItems || [])
    .filter(function(i) { return i.procedureName })
    .map(function(i) {
      return {
        name: i.procedureName,
        tooth: i.toothRef,
        consented: i.consentStatus === 'SIGNED',
      }
    })

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Prescription · ${esc(visit.patient.name)} · ${esc(fmtDate(visit.createdAt))}</title>
<style>
  @page { size: A5; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #0f172a;
    margin: 0;
    padding: 18px;
    font-size: 11pt;
    line-height: 1.4;
  }
  .header { border-bottom: 1.5pt solid #0f172a; padding-bottom: 8pt; margin-bottom: 12pt; }
  .clinic-name { font-size: 15pt; font-weight: 600; margin: 0; }
  .clinic-meta { font-size: 9pt; color: #475569; margin-top: 2pt; }
  .doctor { font-size: 10pt; font-weight: 500; margin-top: 4pt; }
  .doctor-meta { font-size: 9pt; color: #475569; }
  .patient-bar {
    display: flex; justify-content: space-between; gap: 10pt;
    background: #f8fafc; border: 0.5pt solid #e2e8f0; border-radius: 4pt;
    padding: 8pt 10pt; margin-bottom: 14pt;
    font-size: 10pt;
  }
  .patient-bar .label { color: #64748b; font-size: 8.5pt; }
  .patient-bar .val { font-weight: 500; }
  .section { margin-bottom: 12pt; }
  .section-title {
    font-size: 9pt; font-weight: 600; color: #475569;
    text-transform: uppercase; letter-spacing: 0.5pt;
    margin-bottom: 4pt;
    border-bottom: 0.5pt solid #cbd5e1; padding-bottom: 2pt;
  }
  .section-body { font-size: 10.5pt; color: #1e293b; }
  ul { margin: 0; padding-left: 18pt; }
  ul li { margin: 1.5pt 0; }
  .footer {
    margin-top: 22pt;
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 9pt; color: #475569;
  }
  .signature-block { text-align: right; }
  .signature-line { border-top: 0.5pt solid #94a3b8; min-width: 130pt; padding-top: 3pt; margin-top: 28pt; }
  .empty { color: #94a3b8; font-style: italic; font-size: 9.5pt; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
  .print-button {
    position: fixed; top: 10px; right: 10px;
    background: #4f46e5; color: white;
    padding: 8px 16px; border: none; border-radius: 6px;
    cursor: pointer; font-size: 13px;
  }
</style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print</button>

  <div class="header">
    <h1 class="clinic-name">${esc(visit.clinic.name)}</h1>
    <div class="clinic-meta">
      ${esc(visit.clinic.address || '')}${visit.clinic.address && visit.clinic.phone ? ' · ' : ''}${esc(visit.clinic.phone || '')}
    </div>
    <div class="doctor">${esc(visit.doctor.name)}</div>
    <div class="doctor-meta">
      ${esc(visit.doctor.qualification || '')}${visit.doctor.qualification && visit.clinic.regNo ? ' · ' : ''}${visit.clinic.regNo ? 'Reg. ' + esc(visit.clinic.regNo) : ''}
    </div>
  </div>

  <div class="patient-bar">
    <div>
      <div class="label">Patient</div>
      <div class="val">${esc(visit.patient.name)}</div>
    </div>
    <div>
      <div class="label">Age / Sex</div>
      <div class="val">${esc(visit.patient.age || '—')}y · ${esc(visit.patient.gender || '—')}</div>
    </div>
    <div>
      <div class="label">Mobile</div>
      <div class="val">${esc(visit.patient.mobile || '—')}</div>
    </div>
    <div>
      <div class="label">ID</div>
      <div class="val">${esc(visit.patient.originalID || '—')}</div>
    </div>
    <div>
      <div class="label">Visit date</div>
      <div class="val">${esc(fmtDateTime(visit.createdAt))}</div>
    </div>
  </div>

  ${visit.medicalHistory?.chiefComplaint ? `
  <div class="section">
    <div class="section-title">Chief complaint</div>
    <div class="section-body">${esc(visit.medicalHistory.chiefComplaint)}</div>
  </div>` : ''}

  ${(function() {
    // Push #4 Wave 2: split findings sections. Fall back to legacy clinicalNotes
    // for the Clinical section if the new field is empty.
    const clin = visit.clinicalFindings?.clinicalFindings || visit.clinicalFindings?.clinicalNotes || ''
    const radio = visit.clinicalFindings?.radiographicalFindings || ''
    let html = ''
    if (clin) {
      html += '<div class="section"><div class="section-title">Clinical findings</div>'
      html += '<div class="section-body" style="white-space: pre-wrap;">' + esc(clin) + '</div></div>'
    }
    if (radio) {
      html += '<div class="section"><div class="section-title">Radiographical findings</div>'
      html += '<div class="section-body" style="white-space: pre-wrap;">' + esc(radio) + '</div></div>'
    }
    return html
  })()}

  ${plannedTreatments.length > 0 ? `
  <div class="section">
    <div class="section-title">Treatments ${visit.outcome === 'TREATED' ? 'started today' : (visit.outcome === 'CONSENTED' ? 'consented (scheduled)' : 'advised')}</div>
    <div class="section-body">
      <ul>
        ${plannedTreatments.map(function(t) {
          return '<li>' + esc(t.name) + (t.tooth ? ' — tooth ' + esc(t.tooth) : '') + '</li>'
        }).join('')}
      </ul>
    </div>
  </div>` : ''}

  ${medicationLines.length > 0 ? `
  <div class="section">
    <div class="section-title">Medications dispensed</div>
    <div class="section-body">
      <ul>
        ${medicationLines.map(function(m) {
          return '<li>' + esc(m.name) + (m.qty > 1 ? ' (×' + esc(m.qty) + ')' : '') + '</li>'
        }).join('')}
      </ul>
    </div>
  </div>` : ''}

  ${visit.advice ? `
  <div class="section">
    <div class="section-title">Advice</div>
    <div class="section-body" style="white-space: pre-wrap;">${esc(visit.advice)}</div>
  </div>` : ''}

  ${visit.nextAppointmentDate ? `
  <div class="section">
    <div class="section-title">Next appointment</div>
    <div class="section-body">${esc(fmtDate(visit.nextAppointmentDate))}</div>
  </div>` : ''}

  ${(function() {
    // Empty state when no clinical content at all
    const hasFindings = visit.clinicalFindings?.clinicalFindings || visit.clinicalFindings?.clinicalNotes || visit.clinicalFindings?.radiographicalFindings
    if (visit.medicalHistory?.chiefComplaint || hasFindings || plannedTreatments.length > 0 || medicationLines.length > 0 || visit.advice || visit.nextAppointmentDate) return ''
    return '<div class="section"><div class="section-body empty">No clinical details recorded for this visit.</div></div>'
  })()}

  <div class="footer">
    <div>Generated ${esc(fmtDateTime(new Date()))}</div>
    <div class="signature-block">
      <div class="signature-line">${esc(visit.doctor.name)}</div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
