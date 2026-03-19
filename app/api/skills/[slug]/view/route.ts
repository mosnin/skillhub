import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, skillViews, users } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'

// POST /api/skills/[slug]/view
// Records a skill view. No auth required. Deduplicates within a 4-hour window.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.slug, params.slug), eq(skills.isPublished, true)),
  })

  if (!skill) {
    return new NextResponse(null, { status: 204 })
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  const visitorHash = createHash('sha256')
    .update(ip + ua)
    .digest('hex')
    .slice(0, 16)

  // Dedup: skip if same visitorHash viewed this skill in the last 4 hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const existing = await db.query.skillViews.findFirst({
    where: and(
      eq(skillViews.skillId, skill.id),
      eq(skillViews.visitorHash, visitorHash),
      gte(skillViews.createdAt, fourHoursAgo)
    ),
  })

  if (existing) {
    return new NextResponse(null, { status: 204 })
  }

  // Resolve authenticated user if present
  let dbUserId: string | null = null
  try {
    const { userId: clerkId } = auth()
    if (clerkId) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
      })
      dbUserId = dbUser?.id ?? null
    }
  } catch {
    // auth() may throw outside of Clerk middleware context — safe to ignore
  }

  await db.insert(skillViews).values({
    skillId: skill.id,
    visitorHash,
    userId: dbUserId,
  })

  return new NextResponse(null, { status: 204 })
}
