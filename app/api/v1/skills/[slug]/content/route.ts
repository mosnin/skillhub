import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { skills, users, purchases, apiKeys } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/v1/skills/:slug/content
 *
 * Returns the raw SKILL.md content.
 * - Free skills: no auth required
 * - Paid skills: require Authorization: Bearer sh_xxx (API key with valid purchase)
 *
 * Also tracks installs (increments download counter).
 */
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer sh_')) return null

  const key = auth.replace('Bearer ', '')
  const apiKey = await db.query.apiKeys.findFirst({ where: eq(apiKeys.key, key) })
  if (!apiKey) return null

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id))
  return db.query.users.findFirst({ where: eq(users.id, apiKey.userId) })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.slug, params.slug), eq(skills.isPublished, true)),
  })

  if (!skill) {
    return NextResponse.json({ error: 'Not found', code: 'SKILL_NOT_FOUND' }, { status: 404 })
  }

  if (skill.isSuspended) {
    return NextResponse.json(
      { error: 'Skill suspended pending security review', code: 'SKILL_SUSPENDED' },
      { status: 451 }
    )
  }

  // Track install + return content for free skills
  if (skill.priceCents === 0) {
    await db
      .update(skills)
      .set({ downloads: skill.downloads + 1 })
      .where(eq(skills.id, skill.id))

    return NextResponse.json({
      slug: skill.slug,
      name: skill.name,
      version: skill.version,
      content: skill.content,
      install_path: `.skillhub/skills/${skill.slug}/SKILL.md`,
      agent_ref: `@.skillhub/skills/${skill.slug}/SKILL.md`,
    })
  }

  // Paid skill — require auth
  const user = await resolveUser(req)

  if (!user) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        message: 'This is a paid skill. Set SKILLHUB_API_KEY=sh_xxx or use --key flag.',
        purchase_url: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${params.slug}`,
        api_keys_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/api-keys`,
      },
      { status: 401 }
    )
  }

  // Author always has access
  if (skill.authorId === user.id) {
    await db
      .update(skills)
      .set({ downloads: skill.downloads + 1 })
      .where(eq(skills.id, skill.id))

    return NextResponse.json({
      slug: skill.slug,
      name: skill.name,
      version: skill.version,
      content: skill.content,
      install_path: `.skillhub/skills/${skill.slug}/SKILL.md`,
    })
  }

  const purchase = await db.query.purchases.findFirst({
    where: and(
      eq(purchases.userId, user.id),
      eq(purchases.skillId, skill.id),
      eq(purchases.status, 'completed')
    ),
  })

  if (!purchase) {
    return NextResponse.json(
      {
        error: 'Payment required',
        code: 'PAYMENT_REQUIRED',
        price: `$${(skill.priceCents / 100).toFixed(2)}`,
        purchase_url: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${params.slug}`,
      },
      { status: 402 }
    )
  }

  await db
    .update(skills)
    .set({ downloads: skill.downloads + 1 })
    .where(eq(skills.id, skill.id))

  return NextResponse.json({
    slug: skill.slug,
    name: skill.name,
    version: skill.version,
    content: skill.content,
    install_path: `.skillhub/skills/${skill.slug}/SKILL.md`,
    agent_ref: `@.skillhub/skills/${skill.slug}/SKILL.md`,
  })
}
