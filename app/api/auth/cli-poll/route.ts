import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiKeys, cliLoginTokens } from '@/lib/db/schema'
import { and, eq, gt } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  // Find the token that has not expired
  const cliToken = await db.query.cliLoginTokens.findFirst({
    where: and(
      eq(cliLoginTokens.token, token),
      gt(cliLoginTokens.expiresAt, new Date())
    ),
  })

  if (!cliToken) {
    return NextResponse.json({ status: 'expired' })
  }

  if (!cliToken.apiKeyId) {
    return NextResponse.json({ status: 'pending' })
  }

  // Fetch the API key
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.id, cliToken.apiKeyId),
  })

  if (!apiKey) {
    return NextResponse.json({ status: 'expired' })
  }

  // Delete the CLI login token — it's been consumed
  await db.delete(cliLoginTokens).where(eq(cliLoginTokens.id, cliToken.id))

  return NextResponse.json({ status: 'authorized', key: apiKey.key })
}
