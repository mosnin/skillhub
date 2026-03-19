import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, apiKeys } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, params.id), eq(apiKeys.userId, user.id)),
  })
  if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 })

  await db.delete(apiKeys).where(eq(apiKeys.id, params.id))
  return NextResponse.json({ success: true })
}
