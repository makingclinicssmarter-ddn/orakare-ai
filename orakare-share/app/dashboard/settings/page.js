import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import SettingsView from '@/components/settings/SettingsView'

export default async function SettingsPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { email: userId },
    include: { clinic: true }
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Clinic profile and preferences</p>
      </div>
      <SettingsView doctor={doctor} clinic={doctor?.clinic} />
    </div>
  )
}