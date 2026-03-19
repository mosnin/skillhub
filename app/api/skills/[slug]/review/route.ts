import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users, reviews, purchases } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
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

  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.slug, params.slug), eq(skills.isPublished, true)),
  })
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Can't review your own skill
  if (skill.authorId === user.id) {
    return NextResponse.json({ error: 'Cannot review your own skill' }, { status: 403 })
  }

  // Check if user has purchased (or it's free)
  if (skill.priceCents > 0) {
    const purchase = await db.query.purchases.findFirst({
      where: and(
        eq(purchases.userId, user.id),
        eq(purchases.skillId, skill.id),
        eq(purchases.status, 'completed')
      ),
    })
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase required to review' }, { status: 403 })
    }
  }

  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  // Upsert review
  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.userId, user.id), eq(reviews.skillId, skill.id)),
  })

  if (existing) {
    const [updated] = await db
      .update(reviews)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(reviews.id, existing.id))
      .returning()
    return NextResponse.json(updated)
  }

  const [review] = await db
    .insert(reviews)
    .values({
      userId: user.id,
      skillId: skill.id,
      ...parsed.data,
    })
    .returning()

  return NextResponse.json(review, { status: 201 })
}
