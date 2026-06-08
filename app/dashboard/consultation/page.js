import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import ConsultationEntry from '@/components/consultation/ConsultationEntry'

export default async function ConsultationPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { email: userId },
    include: { clinic: true }
  })

  if (!doctor) return null

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-slate-900">Consultation</h1>
        <p className="text-sm text-slate-500 mt-1">Search for a patient to begin or continue consultation</p>
      </div>
      <ConsultationEntry doctorId={doctor.id} clinicId={doctor.clinicId} />
    </div>
  )
}