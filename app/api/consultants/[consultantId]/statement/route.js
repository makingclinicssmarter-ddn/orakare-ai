import { db } from '@/lib/db'

// GET /api/consultants/[consultantId]/statement?from=YYYY-MM-DD&to=YYYY-MM-DD
// Renders an HTML payout statement for a consultant. Defaults to all-time
// if no date range is given.

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

export async function GET(req, props) {
  const params = await props.params
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  const consultant = await db.consultant.findUnique({
    where: { id: params.consultantId },
  })
  if (!consultant) return new Response('Consultant not found', { status: 404 })

  const where = { consultantId: consultant.id, clinicId: consultant.clinicId }
  if (fromStr || toStr) {
    where.createdAt = {}
    if (fromStr) where.createdAt.gte = new Date(fromStr + 'T00:00:00+05:30')
    if (toStr) where.createdAt.lt = new Date(new Date(toStr + 'T00:00:00+05:30').getTime() + 86400000)
  }

  const feeEntries = await db.feeEntry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: {
      treatment: {
        select: {
          id: true, type: true, area: true,
          patient: { select: { name: true, originalID: true } },
        },
      },
    },
  })

  const clinic = await db.clinic.findUnique({ where: { id: consultant.clinicId } })

  const pendingEntries = feeEntries.filter(function(f) { return f.status === 'PENDING' })
  const paidEntries = feeEntries.filter(function(f) { return f.status === 'PAID' })

  const pendingTotal = pendingEntries.reduce(function(s, f) { return s + Number(f.consultantShare || 0) }, 0)
  const paidTotal = paidEntries.reduce(function(s, f) { return s + Number(f.consultantShare || 0) }, 0)
  const lifetimeTotal = pendingTotal + paidTotal

  function buildRow(f) {
    const t = f.treatment
    const pname = (t && t.patient && t.patient.name) || '—'
    const pid = (t && t.patient && t.patient.originalID) || ''
    const tname = t ? ((t.type || 'Treatment') + (t.area ? ' ' + t.area : '')) : '—'
    return '<tr>'
      + '<td>' + formatDate(f.createdAt) + '</td>'
      + '<td>' + escapeHTML(pname) + (pid ? '<span class="muted"> · ' + escapeHTML(pid) + '</span>' : '') + '</td>'
      + '<td>' + escapeHTML(tname) + '</td>'
      + '<td class="right">' + formatINR(f.totalCollected) + '</td>'
      + '<td class="right">' + escapeHTML(f.splitType || '—') + (f.splitValue ? ' (' + f.splitValue + (f.splitType === 'PERCENTAGE' ? '%' : '') + ')' : '') + '</td>'
      + '<td class="right" style="font-weight: 600">' + formatINR(f.consultantShare) + '</td>'
      + (f.status === 'PAID' ? '<td class="muted">Paid ' + formatDate(f.paidDate) + (f.payMode ? ' · ' + escapeHTML(f.payMode) : '') + '</td>' : '<td class="pending-tag">Pending</td>')
      + '</tr>'
  }

  const pendingRows = pendingEntries.length > 0 ? pendingEntries.map(buildRow).join('') : '<tr><td colspan="7" class="muted" style="text-align:center; padding: 16px">No pending entries</td></tr>'
  const paidRows = paidEntries.length > 0 ? paidEntries.map(buildRow).join('') : '<tr><td colspan="7" class="muted" style="text-align:center; padding: 16px">No paid entries yet</td></tr>'

  const periodLabel = (fromStr && toStr) ? (formatDate(fromStr) + ' to ' + formatDate(toStr))
    : fromStr ? ('From ' + formatDate(fromStr))
    : toStr ? ('Through ' + formatDate(toStr))
    : 'All time'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Consultant Statement — ${escapeHTML(consultant.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #f5f5f5; }
    .page { background: #fff; max-width: 920px; margin: 2rem auto; padding: 3rem; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 2px solid #0f6e56; }
    .clinic-name { font-size: 22px; font-weight: 700; color: #0f6e56; }
    .clinic-detail { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.6; }
    .doc-title { font-size: 22px; font-weight: 700; }
    .doc-meta { font-size: 13px; color: #6b7280; text-align: right; margin-top: 4px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
    .meta-block label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; display: block; margin-bottom: 6px; }
    .meta-block p { font-size: 14px; color: #1a1a1a; font-weight: 500; }
    .meta-block .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 2rem; }
    .card { padding: 14px 16px; border-radius: 10px; }
    .card.lifetime { background: #EEEDFE; border: 1px solid #CECBF6; }
    .card.paid { background: #E1F5EE; border: 1px solid #9FE1CB; }
    .card.pending { background: #FCEBEB; border: 1px solid #F7C1C1; }
    .card label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .card .lifetime-c { color: #3C3489; }
    .card .paid-c { color: #085041; }
    .card .pending-c { color: #A32D2D; }
    .card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin: 1.5rem 0 0.5rem; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    th { text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 10px 12px; }
    td { padding: 11px 12px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .muted { color: #9ca3af; font-size: 11px; }
    .pending-tag { color: #A32D2D; font-weight: 600; font-size: 11px; }
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; line-height: 1.6; }
    .print-btn { display: block; margin: 1.5rem auto; padding: 10px 28px; background: #0f6e56; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
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
        </div>
      </div>
      <div>
        <div class="doc-title">Consultant Statement</div>
        <div class="doc-meta">Generated ${formatDate(new Date())}</div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-block">
        <label>Consultant</label>
        <p>${escapeHTML(consultant.name)}</p>
        <p class="sub">${escapeHTML(consultant.specialization || '')}${consultant.phone ? ' · ' + escapeHTML(consultant.phone) : ''}</p>
      </div>
      <div class="meta-block">
        <label>Period</label>
        <p>${escapeHTML(periodLabel)}</p>
        <p class="sub">${feeEntries.length} fee entries · ${pendingEntries.length} pending</p>
      </div>
    </div>

    <div class="summary-cards">
      <div class="card lifetime">
        <label class="lifetime-c">Lifetime total</label>
        <div class="value lifetime-c">${formatINR(lifetimeTotal)}</div>
      </div>
      <div class="card paid">
        <label class="paid-c">Paid out</label>
        <div class="value paid-c">${formatINR(paidTotal)}</div>
      </div>
      <div class="card pending">
        <label class="pending-c">Pending</label>
        <div class="value pending-c">${formatINR(pendingTotal)}</div>
      </div>
    </div>

    <div class="section-title">Pending fees</div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Patient</th><th>Treatment</th>
          <th class="right">Collected</th><th class="right">Split</th><th class="right">Share</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${pendingRows}</tbody>
    </table>

    <div class="section-title" style="margin-top: 2rem">Paid fees</div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Patient</th><th>Treatment</th>
          <th class="right">Collected</th><th class="right">Split</th><th class="right">Share</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${paidRows}</tbody>
    </table>

    <div class="footer">
      Statement reflects fee entries recorded against this consultant as on ${formatDate(new Date())}. Shares are computed on a collect-first basis: consultant share accrues proportionally to amounts actually collected from patients, not the full treatment estimate.
    </div>
  </div>
</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
}
