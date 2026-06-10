import { db } from '@/lib/db'
import { getDoctorContext } from '@/lib/auth-helpers'

export async function GET(request, { params }) {
  const { id } = await params

  // Authn + clinic scoping — was previously public, leaking patient PII
  const { clinicId } = await getDoctorContext()
  if (!clinicId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const invoice = await db.invoice.findFirst({
    where: { id, clinicId },
    include: { patient: true, items: true }
  })

  if (!invoice) {
    return new Response('Invoice not found', { status: 404 })
  }

  const [clinic, doctor] = await Promise.all([
    db.clinic.findUnique({ where: { id: clinicId } }),
    db.doctor.findFirst({ where: { clinicId } }),
  ])

  const doctorName = doctor?.name && doctor.name !== 'Doctor' ? doctor.name : 'Dr. Shobhna Bansal'
  const invoiceDate = new Date(invoice.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const status = invoice.status
  const statusColor = status === 'PAID' ? '#0f6e56' : status === 'PARTIAL' ? '#854F0B' : '#A32D2D'

  const itemRows = invoice.items.length > 0
    ? invoice.items.map(function(item) {
        return '<tr><td>' + item.description + '</td><td class="center">' + item.quantity + '</td><td class="right">₹' + Number(item.unitPrice).toLocaleString('en-IN') + '</td><td class="right">₹' + Number(item.total).toLocaleString('en-IN') + '</td></tr>'
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#9ca3af">Dental treatment services</td></tr>'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Invoice ${invoice.invoiceNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #f5f5f5; }
    .page { background: #fff; max-width: 794px; margin: 2rem auto; padding: 3rem; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 2px solid #0f6e56; }
    .clinic-name { font-size: 22px; font-weight: 700; color: #0f6e56; margin-bottom: 4px; }
    .clinic-detail { font-size: 12px; color: #6b7280; line-height: 1.6; }
    .invoice-title { font-size: 28px; font-weight: 700; color: #1a1a1a; text-align: right; }
    .invoice-meta { font-size: 13px; color: #6b7280; text-align: right; margin-top: 4px; }
    .status-badge { display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: ${statusColor}18; color: ${statusColor}; border: 1px solid ${statusColor}40; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
    .meta-block label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; display: block; margin-bottom: 6px; }
    .meta-block p { font-size: 14px; color: #1a1a1a; font-weight: 500; }
    .meta-block .sub { font-size: 12px; color: #6b7280; font-weight: 400; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    thead tr { background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 10px 12px; }
    .right { text-align: right; }
    .center { text-align: center; }
    td { padding: 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
    tbody tr:last-child td { border-bottom: none; }
    .totals { margin-left: auto; width: 280px; margin-bottom: 2rem; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #6b7280; }
    .total-row.main { font-size: 16px; font-weight: 700; color: #0f6e56; padding-top: 10px; border-top: 2px solid #e5e7eb; margin-top: 4px; }
    .total-row.balance { font-size: 14px; font-weight: 600; color: ${statusColor}; }
    .footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-note { font-size: 12px; color: #9ca3af; max-width: 300px; line-height: 1.6; }
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
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <div class="page">
    <div class="header">
      <div>
        <div class="clinic-name">${clinic?.name || 'Orakare Dental Clinic'}</div>
        <div class="clinic-detail">
          ${clinic?.address ? clinic.address + '<br/>' : ''}
          ${clinic?.phone ? 'Phone: ' + clinic.phone + '<br/>' : ''}
          ${clinic?.email ? 'Email: ' + clinic.email + '<br/>' : ''}
          ${clinic?.gstNo ? 'GST: ' + clinic.gstNo : ''}
        </div>
      </div>
      <div>
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-meta">${invoice.invoiceNo}</div>
        <div class="invoice-meta">${invoiceDate}</div>
        <div><span class="status-badge">${status}</span></div>
      </div>
    </div>

    <div class="meta">
      <div class="meta-block">
        <label>Bill to</label>
        <p>${invoice.patient?.name || '—'}</p>
        ${invoice.patient?.mobile ? '<p class="sub">📞 ' + invoice.patient.mobile + '</p>' : ''}
        ${invoice.patient?.address ? '<p class="sub">' + invoice.patient.address + '</p>' : ''}
      </div>
      <div class="meta-block">
        <label>Doctor</label>
        <p>${doctorName}</p>
        ${clinic?.qualification ? '<p class="sub">' + clinic.qualification + '</p>' : ''}
        ${clinic?.regNo ? '<p class="sub">Reg. No: ' + clinic.regNo + '</p>' : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:50%">Description</th>
          <th class="center">Qty</th>
          <th class="right">Rate (₹)</th>
          <th class="right">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Subtotal</span><span>₹${Number(invoice.subtotal || invoice.total).toLocaleString('en-IN')}</span></div>
      ${Number(invoice.discount || 0) > 0 ? '<div class="total-row"><span>Discount</span><span>- ₹' + Number(invoice.discount).toLocaleString('en-IN') + '</span></div>' : ''}
      <div class="total-row main"><span>Total</span><span>₹${Number(invoice.total).toLocaleString('en-IN')}</span></div>
      <div class="total-row"><span>Paid</span><span>₹${Number(invoice.paid || 0).toLocaleString('en-IN')}</span></div>
      ${Number(invoice.balance || 0) > 0 ? '<div class="total-row balance"><span>Balance due</span><span>₹' + Number(invoice.balance).toLocaleString('en-IN') + '</span></div>' : ''}
      ${invoice.paymentMode ? '<div class="total-row" style="margin-top:4px"><span>Payment mode</span><span>' + invoice.paymentMode + '</span></div>' : ''}
    </div>

    <div class="footer">
      <div class="footer-note">
        ${invoice.notes ? '<p style="margin-bottom:8px;color:#374151">Note: ' + invoice.notes + '</p>' : ''}
        <p>Thank you for choosing ${clinic?.name || 'Orakare Dental Clinic'}.</p>
        <p>This is a computer generated invoice.</p>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-name">${doctorName}</div>
        <div class="signature-title">${clinic?.qualification || 'Dental Surgeon'}</div>
      </div>
    </div>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
