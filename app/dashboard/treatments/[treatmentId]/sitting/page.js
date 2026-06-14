import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getDoctorContext } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import ReturnForSittingScreen from '@/components/treatments/ReturnForSittingScreen'

export default async function ReturnForSittingPage(props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  const t = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId },
    include: {
      patient: { select: { id: true, name: true, mobile: true, age: true, gender: true, originalID: true } },
      treatmentItem: {
        include: {
          sittings: { orderBy: { date: 'desc' }, take: 5 },
        },
      },
      allocations: { select: { amount: true } },
    },
  })
  if (!t) notFound()

  if (t.status === 'COMPLETED' || t.status === 'CANCELLED') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-medium text-amber-900">Treatment is {t.status === 'COMPLETED' ? 'completed' : 'cancelled'}</h2>
          <p className="text-sm text-amber-800 mt-1">
            You can&apos;t add sittings to a {t.status === 'COMPLETED' ? 'completed' : 'cancelled'} treatment.
            {' '}<Link href={'/dashboard/treatments/' + t.id} className="underline">Go back to the treatment</Link>.
          </p>
        </div>
      </div>
    )
  }

  const totalPaid = (t.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
  const estimate = (Number(t.estimate) || 0) - (Number(t.discount) || 0)
  const balance = Math.max(0, estimate - totalPaid)
  const sittings = t.treatmentItem?.sittings || []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
        <Link href="/dashboard/treatments" className="hover:text-slate-600">Treatments</Link>
        <span>›</span>
        <Link href={'/dashboard/treatments/' + t.id} className="hover:text-slate-600">{t.type}{t.area ? ' ' + t.area : ''}</Link>
        <span>›</span>
        <span className="text-slate-600">Add sitting</span>
      </div>

      <ReturnForSittingScreen
        treatment={{
          id: t.id,
          type: t.type,
          area: t.area,
          status: t.status,
          patient: t.patient,
          estimate,
          paid: totalPaid,
          balance,
          recentSittings: sittings,
          expectedSittings: t.expectedSittings,
        }}
      />
    </div>
  )
}
