import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, and, ilike, desc, or, sql } from 'drizzle-orm'
import { z } from 'zod'

const createSkillSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().min(10).max(500),
  content: z.string().min(10),
  readme: z.string().optional(),
  version: z.string().default('1.0.0'),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  priceCents: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const category = searchParams.get('category')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  const conditions = [eq(skills.isPublished, true), eq(skills.isSuspended, false)]

  if (q) {
    conditions.push(
      or(ilike(skills.name, `%${q}%`), ilike(skills.description, `%${q}%`))!
    )
  }
  if (category) {
    conditions.push(eq(skills.category, category))
  }

  const results = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      category: skills.category,
      tags: skills.tags,
      priceCents: skills.priceCents,
      version: skills.version,
      downloads: skills.downloads,
      authorUsername: users.username,
      createdAt: skills.createdAt,
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(skills.downloads))
    .limit(limit)
    .offset(offset)

  return NextResponse.json(results)
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
  const parsed = createSkillSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Check slug uniqueness
  const existing = await db.query.skills.findFirst({
    where: eq(skills.slug, data.slug),
  })
  if (existing) {
    return NextResponse.json(
      { error: 'A skill with this slug already exists' },
      { status: 409 }
    )
  }

  const [skill] = await db
    .insert(skills)
    .values({
      ...data,
      authorId: user.id,
    })
    .returning()

  return NextResponse.json(skill, { status: 201 })
}
