import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { collections, users, collectionSkills, skills } from '@/lib/db/schema'
import { eq, and, max } from 'drizzle-orm'
import { z } from 'zod'

const addSkillSchema = z.object({
  skillId: z.string().uuid(),
})

export async function POST(
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
  const parsed = addSkillSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { skillId } = parsed.data

  // Check skill exists and is published
  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.id, skillId), eq(skills.isPublished, true)),
  })
  if (!skill) {
    return NextResponse.json(
      { error: 'Skill not found or not published' },
      { status: 404 }
    )
  }

  // Check if skill already in collection
  const existing = await db.query.collectionSkills.findFirst({
    where: and(
      eq(collectionSkills.collectionId, collection.id),
      eq(collectionSkills.skillId, skillId)
    ),
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Skill already in collection' },
      { status: 409 }
    )
  }

  // Get max position
  const [maxRow] = await db
    .select({ maxPos: max(collectionSkills.position) })
    .from(collectionSkills)
    .where(eq(collectionSkills.collectionId, collection.id))

  const position = (maxRow?.maxPos ?? -1) + 1

  const [entry] = await db
    .insert(collectionSkills)
    .values({
      collectionId: collection.id,
      skillId,
      position,
    })
    .returning()

  return NextResponse.json(entry, { status: 201 })
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

  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, params.slug),
  })
  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  if (collection.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const skillId = searchParams.get('skillId')
  if (!skillId) {
    return NextResponse.json({ error: 'skillId query param required' }, { status: 400 })
  }

  await db
    .delete(collectionSkills)
    .where(
      and(
        eq(collectionSkills.collectionId, collection.id),
        eq(collectionSkills.skillId, skillId)
      )
    )

  return NextResponse.json({ success: true })
}
