import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { users, apiKeys, cliLoginTokens } from '@/lib/db/schema'
import { eq, and, gt, isNull } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { token } = body
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  // Find the token that is valid and not yet authorized
  const cliToken = await db.query.cliLoginTokens.findFirst({
    where: and(
      eq(cliLoginTokens.token, token),
      gt(cliLoginTokens.expiresAt, new Date()),
      isNull(cliLoginTokens.apiKeyId)
    ),
  })

  if (!cliToken) {
    return NextResponse.json({ error: 'Token not found, expired, or already used' }, { status: 404 })
  }

  // Get the DB user from clerkId
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate a new API key
  const randomHex = crypto.randomBytes(32).toString('hex')
  const key = 'sh_' + randomHex
  const name = 'CLI Login ' + new Date().toISOString().slice(0, 10)

  // Insert the new API key
  const [newApiKey] = await db
    .insert(apiKeys)
    .values({ userId: dbUser.id, key, name })
    .returning()

  // Update the CLI login token with userId and apiKeyId
  await db
    .update(cliLoginTokens)
    .set({ userId: dbUser.id, apiKeyId: newApiKey.id })
    .where(eq(cliLoginTokens.id, cliToken.id))

  return NextResponse.json({ success: true })
}
