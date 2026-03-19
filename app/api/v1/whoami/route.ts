import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, apiKeys, skills } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

/**
 * GET /api/v1/whoami
 * Validate an API key and return the authenticated user's profile.
 * Compatible with OpenClaw's /api/v1/whoami endpoint.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer sh_')) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const key = authHeader.replace('Bearer ', '')
  const apiKey = await db.query.apiKeys.findFirst({ where: eq(apiKeys.key, key) })

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Invalid API key', code: 'INVALID_KEY' },
      { status: 401 }
    )
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, apiKey.userId) })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const [skillCount] = await db
    .select({ count: count() })
    .from(skills)
    .where(eq(skills.authorId, user.id))

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id))

  return NextResponse.json({
    authenticated: true,
    user: {
      username: user.username,
      email: user.email,
      avatar_url: user.avatarUrl,
      stripe_connected: user.stripeAccountEnabled,
      total_earnings_cents: user.totalEarningsCents,
      skills_count: Number(skillCount?.count || 0),
      created_at: user.createdAt,
    },
    key: {
      name: apiKey.name,
      last_used_at: apiKey.lastUsedAt,
      created_at: apiKey.createdAt,
    },
    platform: 'skillhub',
  })
}
