import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, skillVersions, users, purchases } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { newVersionEmail, sendEmail } from '@/lib/email'
import { createNotification } from '@/lib/notifications'

const versionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format (e.g. 1.2.3)'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  changelog: z.string().max(1000, 'Changelog must be 1000 characters or less').optional(),
})

// GET /api/skills/[slug]/versions
// Returns all versions for a published skill (public)
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

  const versions = await db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skill.id))
    .orderBy(desc(skillVersions.createdAt))

  return NextResponse.json({ versions })
}

// POST /api/skills/[slug]/versions
// Publish a new version for a skill (authenticated, must be author)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the current user from DB
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Find the skill (don't restrict to published — author may be editing a draft)
  const skill = await db.query.skills.findFirst({
    where: eq(skills.slug, params.slug),
  })

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Verify the requester is the author
  if (skill.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse and validate the request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = versionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 422 }
    )
  }

  const { version, content, changelog } = parsed.data

  // Insert the new version record
  const [newVersion] = await db
    .insert(skillVersions)
    .values({
      skillId: skill.id,
      version,
      content,
      changelog: changelog ?? null,
    })
    .returning()

  // Update the skill's current version and content
  await db
    .update(skills)
    .set({
      version,
      content,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, skill.id))

  // Non-blocking: notify the author that the version was published
  createNotification(
    skill.authorId,
    'new_version',
    'Version Published',
    `Your skill ${skill.name} was updated to v${version}`,
    `/dashboard/skills/${skill.slug}/versions`
  ).catch(() => {})

  // Non-blocking: notify all purchasers of the new version
  Promise.all(
    (async () => {
      const buyers = await db
        .select({ userId: purchases.userId })
        .from(purchases)
        .where(and(eq(purchases.skillId, skill.id), eq(purchases.status, 'completed')))

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillhub.dev'

      return buyers.map(async ({ userId: buyerId }) => {
        const buyer = await db.query.users.findFirst({
          where: eq(users.id, buyerId),
        })
        if (!buyer?.email) return
        await sendEmail(
          newVersionEmail({
            to: buyer.email,
            skillName: skill.name,
            skillSlug: skill.slug,
            newVersion: version,
            changelog: changelog ?? null,
            appUrl,
          })
        )
      })
    })()
  ).catch(() => {})

  return NextResponse.json({ version: newVersion }, { status: 201 })
}
