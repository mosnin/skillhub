import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notifications, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// GET /api/notifications
// Returns all notifications for the authenticated user with unread count.
export async function GET(_req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const allNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50)

  const unreadCount = allNotifications.filter((n) => !n.isRead).length

  return NextResponse.json({ notifications: allNotifications, unreadCount })
}

// PATCH /api/notifications
// Marks all notifications as read for the authenticated user.
export async function PATCH(_req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, user.id))

  return NextResponse.json({ success: true })
}
