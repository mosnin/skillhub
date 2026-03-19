import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, and, ilike, desc, asc, or, sql } from 'drizzle-orm'

/**
 * SkillHub V1 API — Skills listing
 * Compatible with OpenClaw registry API format
 *
 * GET /api/v1/skills
 *   ?q=search query
 *   ?category=development
 *   ?compatible_with=claude-code
 *   ?price=free|paid
 *   ?sort=downloads|updated|stars|trending
 *   ?limit=20 (max 100)
 *   ?offset=0
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const category = searchParams.get('category')
  const compatibleWith = searchParams.get('compatible_with')
  const price = searchParams.get('price')
  const sort = searchParams.get('sort') || 'downloads'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  const conditions = [eq(skills.isPublished, true), eq(skills.isSuspended, false)]

  if (q) {
    conditions.push(
      or(ilike(skills.name, `%${q}%`), ilike(skills.description, `%${q}%`))!
    )
  }
  if (category) conditions.push(eq(skills.category, category))
  if (price === 'free') conditions.push(eq(skills.priceCents, 0))
  if (price === 'paid') conditions.push(sql`${skills.priceCents} > 0`)

  const orderBy =
    sort === 'updated'
      ? desc(skills.updatedAt)
      : sort === 'price-asc'
      ? asc(skills.priceCents)
      : desc(skills.downloads)

  const [results, countResult] = await Promise.all([
    db
      .select({
        id: skills.id,
        slug: skills.slug,
        name: skills.name,
        description: skills.description,
        version: skills.version,
        category: skills.category,
        tags: skills.tags,
        priceCents: skills.priceCents,
        downloads: skills.downloads,
        compatibleWith: skills.compatibleWith,
        userInvocable: skills.userInvocable,
        homepage: skills.homepage,
        githubRepo: skills.githubRepo,
        scanStatus: skills.scanStatus,
        authorUsername: users.username,
        authorAvatarUrl: users.avatarUrl,
        createdAt: skills.createdAt,
        updatedAt: skills.updatedAt,
      })
      .from(skills)
      .leftJoin(users, eq(skills.authorId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(skills)
      .where(and(...conditions)),
  ])

  const total = Number(countResult[0]?.count || 0)

  // Filter by compatible_with in-memory (array contains)
  const filtered = compatibleWith
    ? results.filter(
        (s) =>
          !s.compatibleWith ||
          s.compatibleWith.includes(compatibleWith) ||
          s.compatibleWith.includes('generic')
      )
    : results

  return NextResponse.json(
    {
      data: filtered.map(formatSkill),
      meta: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    },
    {
      headers: {
        'X-RateLimit-Limit': '120',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  )
}

function formatSkill(s: any) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    description: s.description,
    version: s.version,
    category: s.category,
    tags: s.tags || [],
    price: {
      cents: s.priceCents,
      currency: 'USD',
      free: s.priceCents === 0,
      formatted: s.priceCents === 0 ? 'Free' : `$${(s.priceCents / 100).toFixed(2)}`,
    },
    downloads: s.downloads,
    compatible_with: s.compatibleWith || ['claude-code'],
    'user-invocable': s.userInvocable !== false,
    homepage: s.homepage,
    github_repo: s.githubRepo,
    security: {
      scan_status: s.scanStatus || 'pending',
    },
    author: {
      username: s.authorUsername,
      avatar_url: s.authorAvatarUrl,
    },
    install: {
      command: `npx skillhub@latest install ${s.slug}`,
      path: `.skillhub/skills/${s.slug}/SKILL.md`,
    },
    urls: {
      detail: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${s.slug}`,
      content: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/skills/${s.slug}/content`,
    },
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  }
}
