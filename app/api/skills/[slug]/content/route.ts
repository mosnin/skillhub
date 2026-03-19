import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { skills, users, purchases, apiKeys } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

async function getUserFromRequest(req: NextRequest) {
  // Check Authorization header for API key
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer sh_')) {
    const key = authHeader.replace('Bearer ', '')
    const apiKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.key, key),
    })
    if (!apiKey) return null

    // Update last used
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id))

    return db.query.users.findFirst({
      where: eq(users.id, apiKey.userId),
    })
  }

  // Try Clerk session
  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = auth()
    if (!userId) return null
    return db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    })
  } catch {
    return null
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.slug, params.slug), eq(skills.isPublished, true)),
  })

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Free skills: no auth needed
  if (skill.priceCents === 0) {
    await db
      .update(skills)
      .set({ downloads: skill.downloads + 1 })
      .where(eq(skills.id, skill.id))

    return NextResponse.json({
      content: skill.content,
      name: skill.name,
      version: skill.version,
      slug: skill.slug,
    })
  }

  // Paid skills: require auth + purchase
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // Check if owner
  if (skill.authorId === user.id) {
    return NextResponse.json({
      content: skill.content,
      name: skill.name,
      version: skill.version,
      slug: skill.slug,
    })
  }

  // Check purchase
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
        purchaseUrl: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${params.slug}`,
      },
      { status: 402 }
    )
  }

  await db
    .update(skills)
    .set({ downloads: skill.downloads + 1 })
    .where(eq(skills.id, skill.id))

  return NextResponse.json({
    content: skill.content,
    name: skill.name,
    version: skill.version,
    slug: skill.slug,
  })
}
