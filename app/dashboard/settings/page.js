import Link from 'next/link'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import SettingsView from '@/components/settings/SettingsView'

export default async function SettingsPage() {
  const { userId } = await auth()

  const doctor = await db.doctor.findFirst({
    where: { clerkId: userId },
    include: { clinic: true }
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Clinic profile and preferences</p>
      </div>

      {/* Settings sections navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link
          href="/dashboard/settings/clinic-charges"
          className="block border border-slate-200 rounded-xl p-4 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition group"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Visit charges</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Edit consultation, X-ray, and other preset prices for the Close-visit screen.
              </div>
            </div>
          </div>
        </Link>

        <div className="block border border-slate-200 rounded-xl p-4 bg-slate-50/60">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700">Clinic profile</div>
              <div className="text-xs text-slate-500 mt-0.5">Edit the clinic name, address, doctor info shown on prescription slip and invoice. ↓ Below.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinic profile form (existing) */}
      <div className="border-t border-slate-200 pt-6">
        <h2 className="text-sm font-medium text-slate-700 mb-3">Clinic profile</h2>
        <SettingsView doctor={doctor} clinic={doctor?.clinic} />
      </div>
    </div>
  )
}
