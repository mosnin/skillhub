import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Shield, Package, Users, BarChart3 } from 'lucide-react'
import { AdminNav } from './nav'

function isAdmin(userId: string | null): boolean {
  if (!userId) return false
  const adminIds = process.env.ADMIN_CLERK_IDS?.split(',').map(id => id.trim()) || []
  return adminIds.includes(userId)
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth()
  if (!isAdmin(userId)) redirect('/')

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-56 shrink-0">
          <AdminNav />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
