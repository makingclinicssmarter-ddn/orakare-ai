import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getDoctorContext } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import TreatmentDetailView from '@/components/treatments/TreatmentDetailView'

export default async function TreatmentDetailPage(props) {
  const params = await props.params
  const treatmentId = params.treatmentId

  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  const t = await db.treatment.findFirst({
    where: { id: treatmentId, clinicId: ctx.clinicId },
    include: {
      patient: { select: { id: true, name: true, mobile: true, age: true, gender: true, originalID: true } },
      consultant: { select: { id: true, name: true } },
      treatmentItem: {
        include: {
          sittings: { orderBy: { date: 'desc' } },
        },
      },
      allocations: {
        orderBy: { createdAt: 'desc' },
        include: { receipt: { select: { id: true, date: true, paymentMode: true } } },
      },
    },
  })
  if (!t) notFound()

  const sittings = t.treatmentItem?.sittings || []
  const totalPaid = (t.allocations || []).reduce(function(s, a) { return s + Number(a.amount || 0) }, 0)
  const estimate = (Number(t.estimate) || 0) - (Number(t.discount) || 0)
  const balance = Math.max(0, estimate - totalPaid)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
        <Link href="/dashboard/treatments" className="hover:text-slate-600">Treatments</Link>
        <span>›</span>
        <Link href={'/dashboard/patients/' + t.patient.id} className="hover:text-slate-600">{t.patient.name}</Link>
        <span>›</span>
        <span className="text-slate-600">{t.type}{t.area ? ' ' + t.area : ''}</span>
      </div>

      <TreatmentDetailView
        treatment={t}
        sittings={sittings}
        totalPaid={totalPaid}
        estimate={estimate}
        balance={balance}
      />
    </div>
  )
}
