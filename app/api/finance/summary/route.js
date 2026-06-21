import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDoctorContext, unauthorized, forbidden } from '@/lib/auth-helpers'

// GET /api/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns revenue + expenses summary for a date range.
// Revenue from Receipt rows (current source of truth).

export async function GET(req) {
  const ctx = await getDoctorContext()
  if (!ctx.userId) return unauthorized()
  if (!ctx.clinicId) return forbidden()

  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')

  // Default to current month if no range provided
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const from = fromStr ? new Date(fromStr + 'T00:00:00+05:30') : defaultFrom
  // 'to' is inclusive — add 1 day end-of-range
  const toBase = toStr ? new Date(toStr + 'T00:00:00+05:30') : defaultTo
  const to = new Date(toBase.getTime() + 24 * 60 * 60 * 1000)

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const [receipts, expenses, legacySittings] = await Promise.all([
    db.receipt.findMany({
      where: { clinicId: ctx.clinicId, date: { gte: from, lt: to } },
      select: { id: true, amount: true, date: true, paymentMode: true, notes: true },
      orderBy: { date: 'desc' },
    }),
    db.expense.findMany({
      where: { clinicId: ctx.clinicId, date: { gte: from, lt: to } },
      select: { id: true, amount: true, date: true, category: true, description: true, payee: true },
      orderBy: { date: 'desc' },
    }),
    db.sitting.findMany({
      where: { clinicId: ctx.clinicId, date: { gte: from, lt: to } },
      select: { paid: true, date: true },
    }),
  ])

  // Revenue = Receipts (the new model). For periods where Receipts have no
  // entries on a given date but Sitting.paid has data (pre-Push#3.5 historical),
  // we surface that as well. Keep simple: legacy sitting.paid only counted if
  // there are NO receipts in the same range. This is the same compromise as
  // the dashboard.
  const totalRevenueFromReceipts = receipts.reduce(function(s, r) { return s + Number(r.amount || 0) }, 0)
  const legacyPaidTotal = legacySittings.reduce(function(s, x) { return s + Number(x.paid || 0) }, 0)
  // If receipts exist in this range, use receipts. Otherwise fallback to legacy.
  const totalRevenue = receipts.length > 0 ? totalRevenueFromReceipts : legacyPaidTotal

  const totalExpenses = expenses.reduce(function(s, e) { return s + Number(e.amount || 0) }, 0)

  // Expenses by category
  const expByCategory = {}
  expenses.forEach(function(e) {
    const c = e.category || 'Uncategorised'
    expByCategory[c] = (expByCategory[c] || 0) + Number(e.amount || 0)
  })

  return NextResponse.json({
    range: {
      from: from.toISOString(),
      to: toBase.toISOString(),
    },
    summary: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: totalRevenue - totalExpenses,
      receiptCount: receipts.length,
      expenseCount: expenses.length,
    },
    receipts,
    expenses,
    expByCategory,
  })
}
