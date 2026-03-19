import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'

/**
 * Creates a notification for a user (identified by their DB user id).
 * Intended to be called non-blocking: `createNotification(...).catch(() => {})`.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  href?: string
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    body,
    href: href ?? null,
  })
}
