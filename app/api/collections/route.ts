import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { collections, users, collectionSkills } from '@/lib/db/schema'
import { eq, and, sql, desc } from 'drizzle-orm'
import { z } from 'zod'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

const createCollectionSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  isPublished: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const authorId = searchParams.get('authorId')

  const conditions = [eq(collections.isPublished, true)]
  if (authorId) {
    conditions.push(eq(collections.authorId, authorId))
  }

  const results = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      name: collections.name,
      description: collections.description,
      isPublished: collections.isPublished,
      createdAt: collections.createdAt,
      updatedAt: collections.updatedAt,
      authorId: collections.authorId,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
      skillCount: sql<number>`cast(count(${collectionSkills.id}) as int)`,
    })
    .from(collections)
    .leftJoin(users, eq(collections.authorId, users.id))
    .leftJoin(collectionSkills, eq(collectionSkills.collectionId, collections.id))
    .where(and(...conditions))
    .groupBy(collections.id, users.username, users.avatarUrl)
    .orderBy(desc(collections.createdAt))

  return NextResponse.json({ collections: results })
}

export async function POST(req: NextRequest) {
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

  const body = await req.json()
  const parsed = createCollectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, isPublished } = parsed.data

  // Generate unique slug
  let baseSlug = generateSlug(name)
  let slug = baseSlug
  let attempt = 0

  while (true) {
    const existing = await db.query.collections.findFirst({
      where: eq(collections.slug, slug),
    })
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const [collection] = await db
    .insert(collections)
    .values({
      name,
      slug,
      description: description || null,
      isPublished: isPublished ?? false,
      authorId: user.id,
    })
    .returning()

  return NextResponse.json(collection, { status: 201 })
}
