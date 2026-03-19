import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

interface ClerkUserEvent {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
    username: string | null
    image_url: string
    first_name: string | null
    last_name: string | null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const svix_id = req.headers.get('svix-id') ?? ''
  const svix_timestamp = req.headers.get('svix-timestamp') ?? ''
  const svix_signature = req.headers.get('svix-signature') ?? ''

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let event: ClerkUserEvent

  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkUserEvent
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { type, data } = event
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address

  const username =
    data.username ||
    `${data.first_name || ''}${data.last_name || ''}`.toLowerCase().replace(/\s+/g, '') ||
    `user_${data.id.slice(-8)}`

  if (type === 'user.created') {
    await db
      .insert(users)
      .values({
        clerkId: data.id,
        username,
        email: primaryEmail || '',
        avatarUrl: data.image_url,
      })
      .onConflictDoNothing()
  }

  if (type === 'user.updated') {
    await db
      .update(users)
      .set({
        username,
        email: primaryEmail || '',
        avatarUrl: data.image_url,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, data.id))
  }

  if (type === 'user.deleted') {
    await db.delete(users).where(eq(users.clerkId, data.id))
  }

  return NextResponse.json({ received: true })
}
