import { db } from '@/lib/db'

// GET /api/treatments/[treatmentId]/statement
//
// Push #7: per-treatment statement printout. Shows the patient a full picture
// of one treatment: estimate, accumulated discount, all payments chronologically,
// running balance. Useful when the patient asks "where do I stand on my RCT".
//
// Returns HTML — opens in a new tab from the Records page treatment card.

function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatINR(n) {
  return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN')
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  })
}

export async function GET(_request, props) {
  const params = await props.params
  const { treatmentId } = params

  const treatment = await db.treatment.findUnique({
    where: { id: treatmentId },
    include: {
      patient: { select: { id: true, name: true, mobile: true, originalID: true, age: true, gender: true } },
      consultant: { select: { id: true, name: true } },
      treatmentItem: {
        include: {
          sittings: { orderBy: { date: 'asc' } },
        },
      },
      allocations: {
        orderBy: { createdAt: 'asc' },
        include: { receipt: { select: { id: true, date: true, paymentMode: true, amount: true, notes: true } } },
      },
    },
  })

  if (!treatment) {
    return new Response('Treatment not found', { status: 404 })
  }

  const clinic = await db.clinic.findUnique({ where: { id: treatment.clinicId } })
  const doctor = await db.doctor.findFirst({ where: { clinicId: treatment.clinicId } })
  const doctorName = (doctor && doctor.name && doctor.name !== 'Doctor') ? doctor.name : 'Dr. Shobhna Bansal'

  const estimate = Number(treatment.estimate || 0)
  const discount = Number(treatment.discount || 0)
  const netEstimate = Math.max(0, estimate - discount)
  const allocations = treatment.allocations || []
  const totalPaid = allocations.reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
  const balance = Math.max(0, netEstimate - totalPaid)
  const status = treatment.status
  const statusColor = status === 'COMPLETED' ? '#0f6e56' : status === 'IN_PROGRESS' ? '#854F0B' : status === 'CANCELLED' ? '#6b7280' : '#534AB7'

  const treatmentLabel = (treatment.type || 'Treatment') + (treatment.area ? ' · ' + treatment.area : '')

  // Build running-balance payment rows
  let running = netEstimate
  const paymentRows = allocations.length > 0
    ? allocations.map(function(a) {
        const amt = Number(a.amount || 0)
        running -= amt
        const r = a.receipt || {}
        return '<tr>'
          + '<td>' + formatDate(r.date) + '</td>'
          + '<td>' + escapeHTML(r.paymentMode || '—') + '</td>'
          + '<td class="muted">' + escapeHTML(r.notes || '') + '</td>'
          + '<td class="right">' + formatINR(amt) + '</td>'
          + '<td class="right muted">' + formatINR(Math.max(0, running)) + '</td>'
          + '</tr>'
      }).join('')
    : '<tr><td colspan="5" class="muted" style="text-align:center; padding: 18px">No payments recorded yet.</td></tr>'

  // Sittings list
  const sittingItem = treatment.treatmentItem
  const sittings = (sittingItem && sittingItem.sittings) || []
  const sittingsHtml = sittings.length > 0
    ? '<table style="margin-top: 12px"><thead><tr><th>Date</th><th>Description</th></tr></thead><tbody>'
      + sittings.map(function(s, i) {
          return '<tr><td>' + formatDate(s.date) + '</td><td>' + escapeHTML(s.description || s.notes || 'Sitting ' + (i + 1)) + '</td></tr>'
        }).join('')
      + '</tbody></table>'
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Treatment statement — ${escapeHTML(treatmentLabel)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #f5f5f5; }
    .page { background: #fff; max-width: 794px; margin: 2rem auto; padding: 3rem; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 2px solid #0f6e56; }
    .clinic-name { font-size: 22px; font-weight: 700; color: #0f6e56; margin-bottom: 4px; }
    .clinic-detail { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .doc-title { font-size: 22px; font-weight: 700; color: #1a1a1a; text-align: right; }
    .doc-meta { font-size: 13px; color: #6b7280; text-align: right; margin-top: 4px; }
    .status-badge { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: ${statusColor}18; color: ${statusColor}; border: 1px solid ${statusColor}40; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
    .meta-block label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; display: block; margin-bottom: 6px; }
    .meta-block p { font-size: 14px; color: #1a1a1a; font-weight: 500; }
    .meta-block .sub { font-size: 12px; color: #6b7280; font-weight: 400; margin-top: 2px; }
    .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin: 1.5rem 0 0.5rem; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 10px 12px; }
    .right { text-align: right; }
    td { padding: 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    tbody tr:last-child td { border-bottom: none; }
    .muted { color: #9ca3af; font-size: 12px; }
    .totals { margin-left: auto; width: 320px; margin-top: 1.5rem; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280; }
    .total-row .label { color: #374151; }
    .total-row .value { font-weight: 500; color: #1a1a1a; }
    .total-row.main { font-size: 16px; padding-top: 10px; border-top: 2px solid #e5e7eb; margin-top: 4px; }
    .total-row.main .label, .total-row.main .value { color: #0f6e56; font-weight: 700; }
    .total-row.balance .label { color: ${statusColor}; font-weight: 600; }
    .total-row.balance .value { color: ${statusColor}; font-weight: 700; }
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 11px; color: #9ca3af; max-width: 320px; line-height: 1.6; }
    .signature-line { width: 160px; border-bottom: 1px solid #d1d5db; margin-bottom: 6px; margin-left: auto; }
    .signature-name { font-size: 12px; color: #374151; font-weight: 500; text-align: right; }
    .signature-title { font-size: 11px; color: #9ca3af; text-align: right; }
    .print-btn { display: block; margin: 1.5rem auto; padding: 10px 28px; background: #0f6e56; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; border-radius: 0; padding: 2rem; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print statement</button>

  <div class="page">
    <div class="header">
      <div>
        <div class="clinic-name">${escapeHTML(clinic?.name || 'OraKare Dental Clinic')}</div>
        <div class="clinic-detail">
          ${escapeHTML(clinic?.address || '')}<br/>
          ${clinic?.phone ? 'Phone: ' + escapeHTML(clinic.phone) : ''}
          ${clinic?.email ? ' · ' + escapeHTML(clinic.email) : ''}
        </div>
      </div>
      <div>
        <div class="doc-title">Treatment Statement</div>
        <div class="doc-meta">Generated ${formatDate(new Date())}</div>
        <div class="status-badge">${escapeHTML(status)}</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-block">
        <label>Patient</label>
        <p>${escapeHTML(treatment.patient?.name || '')}</p>
        <p class="sub">${escapeHTML(treatment.patient?.originalID || '')} · ${escapeHTML(treatment.patient?.mobile || '')}</p>
      </div>
      <div class="meta-block">
        <label>Treatment</label>
        <p>${escapeHTML(treatmentLabel)}</p>
        <p class="sub">
          ${treatment.startedAt ? 'Started ' + formatDate(treatment.startedAt) : 'Not started'}
          ${treatment.completedAt ? ' · Completed ' + formatDate(treatment.completedAt) : ''}
        </p>
      </div>
    </div>

    ${sittings.length > 0 ? '<div class="section-title">Sittings recorded</div>' + sittingsHtml : ''}

    <div class="section-title" style="margin-top: 1.5rem">Payments received</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Mode</th>
          <th>Note</th>
          <th class="right">Amount</th>
          <th class="right">Balance after</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span class="label">Estimate</span><span class="value">${formatINR(estimate)}</span></div>
      ${discount > 0 ? '<div class="total-row"><span class="label">Discount applied</span><span class="value">− ' + formatINR(discount) + '</span></div>' : ''}
      <div class="total-row main"><span class="label">Net amount</span><span class="value">${formatINR(netEstimate)}</span></div>
      <div class="total-row"><span class="label">Total paid</span><span class="value" style="color: #0f6e56">${formatINR(totalPaid)}</span></div>
      <div class="total-row balance"><span class="label">${balance > 0 ? 'Balance due' : 'Fully settled'}</span><span class="value">${formatINR(balance)}</span></div>
    </div>

    <div class="footer">
      <div class="footer-note">
        This is a treatment statement reflecting the financial status of this specific treatment as on ${formatDate(new Date())}. For a comprehensive view of all your treatments and payments, please refer to your patient records or ask at the clinic.
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-name">${escapeHTML(doctorName)}</div>
        <div class="signature-title">${escapeHTML(doctor?.qualification || '')}</div>
      </div>
    </div>
  </div>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
