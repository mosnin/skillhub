import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { skills, users, reviews } from '@/lib/db/schema'
import { eq, and, avg, count, sql } from 'drizzle-orm'

/**
 * GET /api/v1/skills/:slug
 * Returns full skill metadata (without content for paid skills)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const result = await db
    .select({
      skill: skills,
      author: users,
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(and(eq(skills.slug, params.slug), eq(skills.isPublished, true)))
    .limit(1)

  if (!result[0]) {
    return NextResponse.json({ error: 'Not found', code: 'SKILL_NOT_FOUND' }, { status: 404 })
  }

  const { skill, author } = result[0]

  // Rating stats
  const ratingResult = await db
    .select({ avg: avg(reviews.rating), count: count() })
    .from(reviews)
    .where(eq(reviews.skillId, skill.id))

  const rating = {
    average: parseFloat(ratingResult[0]?.avg || '0'),
    count: Number(ratingResult[0]?.count || 0),
  }

  return NextResponse.json({
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    version: skill.version,
    category: skill.category,
    tags: skill.tags || [],
    price: {
      cents: skill.priceCents,
      currency: 'USD',
      free: skill.priceCents === 0,
      formatted: skill.priceCents === 0 ? 'Free' : `$${(skill.priceCents / 100).toFixed(2)}`,
    },
    downloads: skill.downloads,
    compatible_with: skill.compatibleWith || ['claude-code'],
    'user-invocable': skill.userInvocable !== false,
    homepage: skill.homepage,
    github_repo: skill.githubRepo,
    github_path: skill.githubPath,
    security: {
      scan_status: skill.scanStatus,
      scan_completed_at: skill.scanCompletedAt,
      flagged: skill.scanStatus === 'flagged',
    },
    validation: {
      status: skill.validationStatus,
      warnings: skill.validationWarnings || [],
    },
    rating,
    author: {
      username: author?.username,
      avatar_url: author?.avatarUrl,
      bio: author?.bio,
    },
    install: {
      command: `npx skillhub@latest install ${skill.slug}`,
      path: `.skillhub/skills/${skill.slug}/SKILL.md`,
      global_path: `~/.skillhub/skills/${skill.slug}/SKILL.md`,
      agent_ref: `@.skillhub/skills/${skill.slug}/SKILL.md`,
    },
    urls: {
      detail: `${process.env.NEXT_PUBLIC_APP_URL}/skills/${skill.slug}`,
      content: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/skills/${skill.slug}/content`,
      versions: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/skills/${skill.slug}/versions`,
      scan: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/skills/${skill.slug}/scan`,
    },
    created_at: skill.createdAt,
    updated_at: skill.updatedAt,
  })
}
