import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { notifications, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

// PATCH /api/notifications/[id]
// Marks a single notification as read.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, params.id), eq(notifications.userId, user.id)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  return NextResponse.json({ notification: updated })
}

// DELETE /api/notifications/[id]
// Deletes a single notification.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const [deleted] = await db
    .delete(notifications)
    .where(and(eq(notifications.id, params.id), eq(notifications.userId, user.id)))
    .returning()

  if (!deleted) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
