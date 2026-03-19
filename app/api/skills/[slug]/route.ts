import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const result = await db
    .select({
      skill: skills,
      author: {
        username: users.username,
        avatarUrl: users.avatarUrl,
        bio: users.bio,
      },
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(and(eq(skills.slug, params.slug), eq(skills.isPublished, true)))
    .limit(1)

  if (!result[0]) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  const { skill, author } = result[0]
  // Don't expose full content via public API without auth check
  return NextResponse.json({
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    category: skill.category,
    tags: skill.tags,
    priceCents: skill.priceCents,
    version: skill.version,
    downloads: skill.downloads,
    createdAt: skill.createdAt,
    author,
  })
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().min(10).max(500).optional(),
  content: z.string().min(10).optional(),
  readme: z.string().optional(),
  version: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priceCents: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const skill = await db.query.skills.findFirst({
    where: eq(skills.slug, params.slug),
  })
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (skill.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const [updated] = await db
    .update(skills)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(skills.id, skill.id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const skill = await db.query.skills.findFirst({
    where: eq(skills.slug, params.slug),
  })
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (skill.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(skills).where(eq(skills.id, skill.id))
  return NextResponse.json({ success: true })
}
