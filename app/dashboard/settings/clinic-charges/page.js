import { redirect } from 'next/navigation'
import { getDoctorContext } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import ClinicChargesEditor from '@/components/settings/ClinicChargesEditor'
import Link from 'next/link'

export default async function ClinicChargesPage() {
  const ctx = await getDoctorContext()
  if (!ctx.clinicId) redirect('/sign-in')

  const clinic = await db.clinic.findUnique({
    where: { id: ctx.clinicId },
    select: { id: true, name: true, charges: true },
  })

  if (!clinic) redirect('/sign-in')

  const initialCharges = Array.isArray(clinic.charges) ? clinic.charges : []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
        ← Back to dashboard
      </Link>
      <div className="mt-3">
        <h1 className="text-2xl font-medium text-slate-900">Clinic charges</h1>
        <p className="text-sm text-slate-500 mt-1">
          Standard fees that appear as quick buttons when closing a visit
          (consultation, radiograph, dressing, etc.). Add new ones over time as
          your services grow. Edit the amount whenever prices change.
        </p>
      </div>

      <div className="mt-6">
        <ClinicChargesEditor clinicId={clinic.id} initialCharges={initialCharges} />
      </div>
    </div>
  )
}
