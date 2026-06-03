import { UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function Dashboard() {
  const { userId } = await auth()

  return (
    <div style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1>OraKare AI</h1>
        <UserButton />
      </div>
      <p>Welcome to OraKare AI. Your dashboard is being built.</p>
    </div>
  )
}