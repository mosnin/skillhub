import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cliLoginTokens } from '@/lib/db/schema'

export async function POST() {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await db.insert(cliLoginTokens).values({
    token,
    userId: null,
    apiKeyId: null,
    expiresAt,
  })

  return NextResponse.json({ token })
}
