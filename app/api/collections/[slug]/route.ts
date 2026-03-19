import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { collections, users, collectionSkills, skills } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.slug, params.slug), eq(collections.isPublished, true)),
  })

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const author = await db.query.users.findFirst({
    where: eq(users.id, collection.authorId),
  })

  const collectionSkillRows = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      category: skills.category,
      tags: skills.tags,
      priceCents: skills.priceCents,
      downloads: skills.downloads,
      version: skills.version,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
      position: collectionSkills.position,
    })
    .from(collectionSkills)
    .innerJoin(skills, eq(collectionSkills.skillId, skills.id))
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(eq(collectionSkills.collectionId, collection.id))
    .orderBy(asc(collectionSkills.position))

  return NextResponse.json({
    collection: {
      ...collection,
      author: author
        ? { username: author.username, avatarUrl: author.avatarUrl }
        : null,
      skills: collectionSkillRows,
    },
  })
}

const updateCollectionSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
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

  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, params.slug),
  })
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  if (collection.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateCollectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(collections)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(collections.id, collection.id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
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

  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, params.slug),
  })
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  if (collection.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(collections).where(eq(collections.id, collection.id))
  return NextResponse.json({ success: true })
}
