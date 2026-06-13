// ═══════════════════════════════════════════════════════════════════════════════
//  OraKare — historical data importer
//  Run from project root: node scripts/import-historical-data.js
//  Add --commit to actually write (default is dry-run).
//
//  Reads CSVs from scripts/csv-imports/ and imports into the configured clinic.
//  IMPORTANT: This is destructive. It wipes ALL transactional data for the
//  target clinic before importing (visits, treatments, sittings, receipts, etc.)
//  Patient demographic rows are preserved and matched by originalID.
//
//  Safe to re-run because every run wipes and re-imports from the same source.
// ═══════════════════════════════════════════════════════════════════════════════

require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local', override: true })

const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

// ── CONFIG — adjust if running for a different clinic ──────────────────────────
const CLINIC_ID = 'cmpyguilj00007wnzp5xnvy7j'         // Dr. Shobhna Bansal Orakare Dental Clinic
const DOCTOR_ID = 'cmpyguilj00017wnzvkdqg4gu'         // Dr. Shobhna Bansal
const CSV_DIR   = path.join(process.cwd(), 'scripts', 'csv-imports')

const COMMIT = process.argv.includes('--commit')

// ── HELPERS ────────────────────────────────────────────────────────────────────

function log(msg) {
  console.log('[' + new Date().toISOString().slice(11, 19) + '] ' + msg)
}

function loadCsv(filename) {
  const full = path.join(CSV_DIR, filename)
  if (!fs.existsSync(full)) {
    log('WARN: missing ' + filename + ' — skipping')
    return []
  }
  const text = fs.readFileSync(full, 'utf8')
  const result = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (result.errors && result.errors.length > 0) {
    log('CSV parse errors in ' + filename + ':')
    result.errors.slice(0, 5).forEach(function(e) { log('  ' + JSON.stringify(e)) })
  }
  return result.data
}

function parseDate(s) {
  if (!s || typeof s !== 'string') return null
  const trimmed = s.trim()
  if (!trimmed) return null
  // Accepts ISO 8601 ("2026-04-27T18:08:38.884Z") and "YYYY-MM-DD HH:MM:SS"
  // and "YYYY-MM-DD". Returns null if invalid.
  const d = new Date(trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') + '+05:30' : trimmed)
  return isNaN(d.getTime()) ? null : d
}

function parseNumber(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback === undefined ? null : fallback
  const n = Number(String(v).replace(/,/g, ''))
  return isNaN(n) ? (fallback === undefined ? null : fallback) : n
}

function parseConsumables(text) {
  // Source format examples:
  //   "Mouthwash (Chlorhexidine) x1=Rs 300, Toothpaste (Whitening) x1=Rs 300"
  //   "Other (Custom) x1=Rs 115"
  // Returns: [{ name, qty, price }, ...]
  if (!text || typeof text !== 'string') return []
  const items = text.split(',').map(function(s) { return s.trim() }).filter(Boolean)
  return items.map(function(part) {
    const m = part.match(/^(.+?)\s*x(\d+)\s*=\s*Rs\s*(\d+(?:\.\d+)?)$/i)
    if (m) return { name: m[1].trim(), qty: parseInt(m[2], 10), price: parseFloat(m[3]) }
    return { name: part, qty: 1, price: 0 }
  })
}

function mapTreatmentStatus(raw) {
  // Source values from old PMS: "Complete", "Ongoing" (per Apps Script).
  // TreatmentStatus enum: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED.
  const s = (raw || '').toString().trim().toLowerCase()
  if (s === 'complete' || s === 'completed' || s === '2') return 'COMPLETED'
  if (s === 'ongoing' || s === 'in_progress' || s === '1') return 'IN_PROGRESS'
  if (s === 'cancelled' || s === 'canceled') return 'CANCELLED'
  if (s === 'planned' || s === 'plan') return 'PLANNED'
  return 'IN_PROGRESS'  // default for unknown / blank
}

function trim(v) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// ── PHASE 0: LOAD AND VALIDATE CSV INPUT ───────────────────────────────────────

async function phase0_load() {
  log('═══ Phase 0: loading CSVs from ' + CSV_DIR)

  const csvs = {
    patients:    loadCsv('Patients.csv'),
    treatments:  loadCsv('Treatments.csv'),
    sittings:    loadCsv('Sittings.csv'),
    invoices:    loadCsv('Invoices.csv'),
    inventory:   loadCsv('Inventory.csv'),
    expenses:    loadCsv('Expenses.csv'),
    consultants: loadCsv('Consultants.csv'),
  }

  log('  Patients:    ' + csvs.patients.length + ' rows  (will match to existing patient records by ID)')
  log('  Treatments:  ' + csvs.treatments.length + ' rows')
  log('  Sittings:    ' + csvs.sittings.length + ' rows')
  log('  Invoices:    ' + csvs.invoices.length + ' rows')
  log('  Inventory:   ' + csvs.inventory.length + ' rows')
  log('  Expenses:    ' + csvs.expenses.length + ' rows')
  log('  Consultants: ' + csvs.consultants.length + ' rows')

  // Sanity checks
  if (csvs.treatments.length === 0) throw new Error('No treatments found — CSV files missing or empty.')

  // Confirm clinic + doctor exist
  const clinic = await db.clinic.findUnique({ where: { id: CLINIC_ID } })
  if (!clinic) throw new Error('Clinic not found: ' + CLINIC_ID)
  const doctor = await db.doctor.findUnique({ where: { id: DOCTOR_ID } })
  if (!doctor) throw new Error('Doctor not found: ' + DOCTOR_ID)
  log('  Target clinic: ' + clinic.name + ' (' + CLINIC_ID + ')')
  log('  Doctor:        ' + doctor.name + ' (' + DOCTOR_ID + ')')

  // Build patient lookup map: originalID → patient.id
  const existingPatients = await db.patient.findMany({
    where: { clinicId: CLINIC_ID },
    select: { id: true, originalID: true, name: true },
  })
  const patientByOrigId = {}
  existingPatients.forEach(function(p) {
    if (p.originalID) patientByOrigId[p.originalID] = p
  })
  log('  Loaded ' + existingPatients.length + ' existing patient records for matching')

  // Find treatments whose patient is not in the DB — they'll be skipped
  const unmatched = csvs.treatments.filter(function(t) {
    return !patientByOrigId[t['Patient ID']]
  })
  if (unmatched.length > 0) {
    log('  ⚠ ' + unmatched.length + ' treatments reference patient IDs not in DB — will skip:')
    unmatched.slice(0, 5).forEach(function(t) {
      log('    ' + t['ID'] + ' (Patient ID=' + t['Patient ID'] + ')')
    })
  }

  return { csvs, clinic, patientByOrigId }
}

// ── PHASE 1: WIPE EXISTING TRANSACTIONAL DATA ──────────────────────────────────

async function phase1_wipe(tx) {
  log('═══ Phase 1: wipe existing transactional data for clinic ' + CLINIC_ID)

  // Count first so we can show what'll be removed
  const counts = {
    visits: await tx.visit.count({ where: { clinicId: CLINIC_ID } }),
    treatments: await tx.treatment.count({ where: { clinicId: CLINIC_ID } }),
    sittings: await tx.sitting.count({ where: { clinicId: CLINIC_ID } }),
    receipts: await tx.receipt.count({ where: { clinicId: CLINIC_ID } }),
    invoices: await tx.invoice.count({ where: { clinicId: CLINIC_ID } }),
    expenses: await tx.expense.count({ where: { clinicId: CLINIC_ID } }),
    inventory: await tx.inventoryItem.count({ where: { clinicId: CLINIC_ID } }),
    consultants: await tx.consultant.count({ where: { clinicId: CLINIC_ID } }),
  }
  log('  Before wipe:')
  Object.keys(counts).forEach(function(k) { log('    ' + k + ': ' + counts[k]) })

  // Delete children-first, parents-last.
  // Within the clinic, every transactional row gets nuked.
  await tx.paymentAllocation.deleteMany({
    where: { OR: [
      { receipt: { clinicId: CLINIC_ID } },
      { treatment: { clinicId: CLINIC_ID } },
    ] },
  })
  await tx.feeEntry.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.receipt.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.sitting.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.followUp.deleteMany({ where: { patient: { clinicId: CLINIC_ID } } })
  await tx.treatment.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.invoiceItem.deleteMany({ where: { invoice: { clinicId: CLINIC_ID } } })
  await tx.invoice.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.treatmentItem.deleteMany({
    where: { treatmentPlan: { visit: { clinicId: CLINIC_ID } } },
  })
  await tx.treatmentPlan.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.medicalHistory.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.examConsent.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.clinicalFindings.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.diagnosis.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.clinicalRecord.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.communication.deleteMany({ where: { visit: { clinicId: CLINIC_ID } } })
  await tx.visit.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.expense.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.inventoryItem.deleteMany({ where: { clinicId: CLINIC_ID } })
  await tx.consultant.deleteMany({ where: { clinicId: CLINIC_ID } })

  // Also reset ClinicCounter (invoice + patient counters will be recomputed)
  // We DO keep the row so the unique constraint isn't violated when imports add invoices
  await tx.clinicCounter.deleteMany({ where: { clinicId: CLINIC_ID } })

  log('  Wipe complete.')
}

// ── PHASE 2: IMPORT CONSULTANTS ───────────────────────────────────────────────

async function phase2_consultants(tx, rows) {
  log('═══ Phase 2: import ' + rows.length + ' consultant(s)')
  const idMap = {}  // CSV ID → DB id
  for (const r of rows) {
    if (!trim(r['ID']) || !trim(r['Name'])) continue
    const created = await tx.consultant.create({
      data: {
        clinicId: CLINIC_ID,
        name: r['Name'],
        specialization: trim(r['Specialization']),
        phone: trim(r['Phone']),
        email: trim(r['Email']),
        splitType: trim(r['Split Type']) || 'percent',
        splitValue: parseNumber(r['Split Value'], 0),
        notes: trim(r['Notes']),
        active: (r['Active'] || '').toString().toLowerCase() !== 'no',
      },
    })
    idMap[r['ID']] = created.id
    log('  ✓ ' + r['Name'] + ' (' + r['ID'] + ' → ' + created.id + ')')
  }
  return idMap
}

// ── PHASE 3: IMPORT INVENTORY ─────────────────────────────────────────────────

async function phase3_inventory(tx, rows) {
  log('═══ Phase 3: import ' + rows.length + ' inventory items')
  for (const r of rows) {
    if (!trim(r['Name'])) continue
    await tx.inventoryItem.create({
      data: {
        clinicId: CLINIC_ID,
        name: r['Name'],
        category: trim(r['Category']) || 'Other',
        unit: trim(r['Unit']) || 'pcs',
        stockQty: parseNumber(r['Stock Qty'], 0),
        minStock: parseNumber(r['Min Stock'], 0),
        unitCost: parseNumber(r['Unit Cost'], 0),
        supplier: trim(r['Supplier']),
        expiryDate: parseDate(r['Expiry Date']),
        notes: trim(r['Notes']),
      },
    })
  }
  log('  ✓ inventory loaded')
}

// ── PHASE 4: IMPORT TREATMENTS, SITTINGS, RECEIPTS ─────────────────────────────

async function phase4_treatments(tx, treatments, sittings, patientByOrigId, consultantIdMap) {
  log('═══ Phase 4: import ' + treatments.length + ' treatment(s) with sittings + receipts')

  // Build sitting → treatmentId index (CSV side) for fast lookup
  const sittingsByTreatmentId = {}
  sittings.forEach(function(s) {
    const tid = s['Treatment ID']
    if (!sittingsByTreatmentId[tid]) sittingsByTreatmentId[tid] = []
    sittingsByTreatmentId[tid].push(s)
  })

  let imported = 0, skipped = 0
  let sittingsCreated = 0, receiptsCreated = 0

  for (const t of treatments) {
    const patientCsvId = t['Patient ID']
    const patient = patientByOrigId[patientCsvId]
    if (!patient) {
      skipped++
      continue
    }

    const status = mapTreatmentStatus(t['Status'])
    const startedAt = parseDate(t['Started At'])
    const completedAt = parseDate(t['Completed At'])

    // Synthetic Visit — anchor in time on the treatment's startedAt.
    // Status COMPLETED because this is historical. No MedicalHistory/etc.
    const visit = await tx.visit.create({
      data: {
        clinicId: CLINIC_ID,
        patientId: patient.id,
        doctorId: DOCTOR_ID,
        status: 'COMPLETED',
        createdAt: startedAt || completedAt || new Date(),
      },
    })

    // TreatmentPlan
    const plan = await tx.treatmentPlan.create({
      data: {
        visitId: visit.id,
        approvedBy: DOCTOR_ID,   // historical treatments approved by Dr. Shobhna
        approvedAt: startedAt || new Date(),
      },
    })

    // TreatmentItem — the planned procedure record
    const item = await tx.treatmentItem.create({
      data: {
        treatmentPlanId: plan.id,
        procedureName: trim(t['Type']) || 'Unspecified',
        toothRef: trim(t['Area']),
        estimatedCost: parseNumber(t['Estimate'], 0),
        estimatedSessions: parseNumber(t['Expected Sittings'], null) || null,
        consentStatus: 'SIGNED',  // historical treatments were consented
        consentSignedAt: startedAt || new Date(),
        originalID: trim(t['ID']),
      },
    })

    // Treatment — the execution wrapper
    const treatment = await tx.treatment.create({
      data: {
        clinicId: CLINIC_ID,
        patientId: patient.id,
        visitId: visit.id,
        type: trim(t['Type']) || 'Unspecified',
        area: trim(t['Area']),
        notes: trim(t['Notes']),
        estimate: parseNumber(t['Estimate'], 0),
        discount: parseNumber(t['Discount'], 0),
        expectedSittings: parseNumber(t['Expected Sittings'], null) || null,
        status: status,
        startedAt: startedAt,
        completedAt: completedAt,
        consultantId: consultantIdMap[t['Consultant ID']] || null,
        splitType: trim(t['Split Type']),
        splitValue: parseNumber(t['Split Value'], null),
        treatmentItemId: item.id,
      },
    })

    // Sittings — note: Sitting.treatmentId is misleadingly named, it FK's to
    // TreatmentItem.id, not Treatment.id. (Push #3 will rename for clarity.)
    const childSittings = sittingsByTreatmentId[t['ID']] || []
    for (const s of childSittings) {
      const consumables = parseConsumables(s['Consumables'])
      const paid = parseNumber(s['Paid'], 0)
      const sittingDate = parseDate(s['Date']) || parseDate(s['Saved At']) || startedAt || new Date()

      const sittingNotes = trim(s['Notes'])
      const sittingDescription = trim(s['Done']) || trim(s['Prescription'])

      const sitting = await tx.sitting.create({
        data: {
          clinicId: CLINIC_ID,
          patientId: patient.id,
          treatmentId: item.id,   // ← TreatmentItem.id (see comment above)
          date: sittingDate,
          done: true,
          prescription: trim(s['Prescription']),
          notes: sittingNotes,
          description: sittingDescription,
          consumables: consumables,
          consumablesTotal: parseNumber(s['Consumables Total'], 0),
          paid: paid,
          payMode: trim(s['Pay Mode']),
        },
      })
      sittingsCreated++

      // For paid sittings, mirror the existing Sitting API behavior:
      // create a Receipt + PaymentAllocation tied to this Treatment
      if (paid > 0) {
        const receipt = await tx.receipt.create({
          data: {
            clinicId: CLINIC_ID,
            patientId: patient.id,
            amount: paid,
            paymentMode: trim(s['Pay Mode']) || 'Cash',
            notes: 'Sitting payment — ' + (sittingDescription || sittingNotes || 'Imported'),
            date: sittingDate,
          },
        })
        await tx.paymentAllocation.create({
          data: {
            receiptId: receipt.id,
            treatmentId: treatment.id,
            amount: paid,
          },
        })
        receiptsCreated++
      }
    }

    imported++
    if (imported % 20 === 0) log('  … ' + imported + ' treatments done')
  }

  log('  ✓ ' + imported + ' treatments imported, ' + skipped + ' skipped (missing patient)')
  log('  ✓ ' + sittingsCreated + ' sittings, ' + receiptsCreated + ' receipts created')
  return { imported, skipped, sittingsCreated, receiptsCreated }
}

// ── PHASE 5: IMPORT INVOICES ──────────────────────────────────────────────────

async function phase5_invoices(tx, rows, patientByOrigId) {
  log('═══ Phase 5: import ' + rows.length + ' invoice(s)')
  let created = 0, maxSeq = 0

  for (const r of rows) {
    const patient = patientByOrigId[r['Patient ID']]
    if (!patient) {
      log('  ⚠ skipping invoice ' + r['Invoice No'] + ' (patient ' + r['Patient ID'] + ' not in DB)')
      continue
    }

    let items = []
    try {
      items = JSON.parse(r['Items JSON'] || '[]')
    } catch (e) {
      log('  ⚠ invoice ' + r['Invoice No'] + ' has unparseable Items JSON, items left empty')
    }

    const inv = await tx.invoice.create({
      data: {
        clinicId: CLINIC_ID,
        patientId: patient.id,
        invoiceNo: r['Invoice No'],
        date: parseDate(r['Date']) || new Date(),
        subtotal: parseNumber(r['Subtotal'], 0),
        discount: parseNumber(r['Discount'], 0),
        total: parseNumber(r['Total'], 0),
        paid: parseNumber(r['Paid'], 0),
        balance: parseNumber(r['Balance'], 0),
        paymentMode: trim(r['Payment Mode']),
        notes: trim(r['Notes']),
        status: (r['Status'] || 'PARTIAL').toString().toUpperCase(),
      },
    })

    for (const it of items) {
      // CSV item shape: { desc, qty, unitPrice, discount, amount }
      // Schema fields:  invoiceId, description, quantity, unitPrice, total
      // The CSV's per-item `discount` doesn't have a column in InvoiceItem
      // (invoice-level discount is preserved on the Invoice row). CSV's
      // `amount` is the line total after discount — maps to schema `total`.
      await tx.invoiceItem.create({
        data: {
          invoiceId: inv.id,
          description: it.desc || it.description || 'Item',
          quantity: parseNumber(it.qty, 1),
          unitPrice: parseNumber(it.unitPrice, 0),
          total: parseNumber(it.amount, 0) || (parseNumber(it.qty, 1) * parseNumber(it.unitPrice, 0)),
        },
      })
    }

    // Track max invoice sequence so we set ClinicCounter correctly
    const m = (r['Invoice No'] || '').match(/(\d{4})$/)
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10))

    created++
  }

  log('  ✓ ' + created + ' invoices created (max sequence: ' + maxSeq + ')')
  return { created, maxSeq }
}

// ── PHASE 6: IMPORT EXPENSES ──────────────────────────────────────────────────

async function phase6_expenses(tx, rows) {
  log('═══ Phase 6: import ' + rows.length + ' expense(s)')
  for (const r of rows) {
    if (!trim(r['Description']) && !parseNumber(r['Amount'], null)) continue
    await tx.expense.create({
      data: {
        clinicId: CLINIC_ID,
        description: trim(r['Description']) || 'Expense',
        category: trim(r['Category']) || 'Other',
        amount: parseNumber(r['Amount'], 0),
        date: parseDate(r['Date']) || new Date(),
        payee: trim(r['Payee']),
        paymentMode: trim(r['Payment Mode']),
        notes: trim(r['Notes']),
        recurring: (r['Recurring'] || '').toString().toLowerCase() === 'yes',
      },
    })
  }
  log('  ✓ expenses loaded')
}

// ── PHASE 7: RESEED CLINIC COUNTERS ────────────────────────────────────────────

async function phase7_counters(tx, patientByOrigId, invoiceMaxSeq) {
  log('═══ Phase 7: reseed ClinicCounter')

  // PATIENT counter = max numeric suffix of any existing originalID
  const patientIds = Object.keys(patientByOrigId)
  let patientMax = 0
  patientIds.forEach(function(orig) {
    const m = orig.match(/(\d+)$/)
    if (m) patientMax = Math.max(patientMax, parseInt(m[1], 10))
  })

  await tx.clinicCounter.create({
    data: { clinicId: CLINIC_ID, kind: 'PATIENT', lastValue: patientMax },
  })
  log('  ✓ PATIENT lastValue = ' + patientMax)

  await tx.clinicCounter.create({
    data: { clinicId: CLINIC_ID, kind: 'INVOICE', lastValue: invoiceMaxSeq },
  })
  log('  ✓ INVOICE lastValue = ' + invoiceMaxSeq)
}

// ── PHASE 8: VERIFY ────────────────────────────────────────────────────────────

async function phase8_verify(tx) {
  log('═══ Phase 8: verification')

  const counts = {
    visits:        await tx.visit.count({ where: { clinicId: CLINIC_ID } }),
    treatments:    await tx.treatment.count({ where: { clinicId: CLINIC_ID } }),
    treatmentItems:await tx.treatmentItem.count({ where: { treatmentPlan: { visit: { clinicId: CLINIC_ID } } } }),
    sittings:      await tx.sitting.count({ where: { clinicId: CLINIC_ID } }),
    receipts:      await tx.receipt.count({ where: { clinicId: CLINIC_ID } }),
    invoices:      await tx.invoice.count({ where: { clinicId: CLINIC_ID } }),
    expenses:      await tx.expense.count({ where: { clinicId: CLINIC_ID } }),
    inventory:     await tx.inventoryItem.count({ where: { clinicId: CLINIC_ID } }),
    consultants:   await tx.consultant.count({ where: { clinicId: CLINIC_ID } }),
  }

  log('  After import:')
  Object.keys(counts).forEach(function(k) { log('    ' + k + ': ' + counts[k]) })

  const totalPaid = await tx.receipt.aggregate({
    where: { clinicId: CLINIC_ID },
    _sum: { amount: true },
  })
  log('  Total collected (receipts): ₹' + (totalPaid._sum.amount || 0).toLocaleString('en-IN'))
}

// ── MAIN ───────────────────────────────────────────────────────────────────────

async function main() {
  log('OraKare historical data importer')
  log('Mode: ' + (COMMIT ? '⚠ COMMIT (writes will happen)' : 'DRY-RUN (no writes, rollback at end)'))
  log('')

  const loaded = await phase0_load()
  const { csvs, patientByOrigId } = loaded

  // Wrap everything in one big transaction with a generous timeout.
  // 5 min should be plenty for ~600 inserts.
  let result
  try {
    result = await db.$transaction(async function(tx) {
      await phase1_wipe(tx)
      const consultantMap = await phase2_consultants(tx, csvs.consultants)
      await phase3_inventory(tx, csvs.inventory)
      const t4 = await phase4_treatments(tx, csvs.treatments, csvs.sittings, patientByOrigId, consultantMap)
      const t5 = await phase5_invoices(tx, csvs.invoices, patientByOrigId)
      await phase6_expenses(tx, csvs.expenses)
      await phase7_counters(tx, patientByOrigId, t5.maxSeq)
      await phase8_verify(tx)

      if (!COMMIT) {
        log('')
        log('═══ DRY-RUN — rolling back. Re-run with --commit to write.')
        throw new Error('__DRY_RUN_ROLLBACK__')
      }

      return { t4, t5 }
    }, { maxWait: 60000, timeout: 600000 })
  } catch (err) {
    if (err.message === '__DRY_RUN_ROLLBACK__') {
      log('Rollback complete. Database is unchanged.')
      log('')
      log('To actually commit, run:')
      log('  node scripts/import-historical-data.js --commit')
      process.exit(0)
    }
    throw err
  }

  log('')
  log('═══ ✓ IMPORT COMMITTED')
  log('')
  log('Next steps:')
  log('  1. Open the app, navigate to /dashboard/patients')
  log('  2. Click into a patient with treatment history (e.g. ORK-001)')
  log('  3. Verify the Records page shows treatments + sittings correctly')
  log('  4. Check financial summary numbers look right')
  log('')
}

main()
  .catch(function(err) {
    log('ERROR: ' + err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  })
  .finally(function() { return db.$disconnect() })
