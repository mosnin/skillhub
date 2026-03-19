import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, apiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateApiKey } from '@/lib/utils'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, user.id),
    orderBy: (keys, { desc }) => [desc(keys.createdAt)],
  })

  // Never return the actual key after creation
  return NextResponse.json(
    keys.map((k) => ({ ...k, key: `sh_...${k.key.slice(-8)}` }))
  )
}

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const rl = rateLimit(`keys:${userId}`, 5, 60_000) // 5 key creates per minute per user
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Max 10 keys per user
  const existing = await db.query.apiKeys.findMany({ where: eq(apiKeys.userId, user.id) })
  if (existing.length >= 10) {
    return NextResponse.json({ error: 'Maximum 10 API keys allowed' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = z.object({ name: z.string().min(1).max(50) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const key = generateApiKey()
  const [apiKey] = await db
    .insert(apiKeys)
    .values({ userId: user.id, key, name: parsed.data.name })
    .returning()

  // Return full key only on creation
  return NextResponse.json({ ...apiKey, key }, { status: 201 })
}
