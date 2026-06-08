import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Warm up DB connection for every dashboard page
  db.$queryRaw`SELECT 1`.catch(function() {})

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto min-w-0">
        {children}
      </div>
    </div>
  )
}