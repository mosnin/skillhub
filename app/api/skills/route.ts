import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, and, ilike, desc, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { validateSkill } from '@/lib/skill-validator'
import { quickSafetyCheck, submitScan } from '@/lib/virustotal'

const createSkillSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Slug must be lowercase with letters, numbers, and hyphens'),
  description: z.string().min(10).max(500),
  content: z.string().min(10).max(524288),
  readme: z.string().max(524288).optional(),
  version: z.string().default('1.0.0'),
  category: z.string(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  priceCents: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
  compatibleWith: z.array(z.string()).default(['claude-code']),
  userInvocable: z.boolean().default(true),
  homepage: z.string().url().optional().or(z.literal('')),
  githubRepo: z.string().optional(),
  githubPath: z.string().optional(),
  githubRef: z.string().optional(),
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
      compatibleWith: skills.compatibleWith,
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

  // ── Duplicate slug check ──────────────────────────────────────────────────
  const existing = await db.query.skills.findFirst({
    where: eq(skills.slug, data.slug),
  })
  if (existing) {
    return NextResponse.json({ error: 'A skill with this slug already exists' }, { status: 409 })
  }

  // ── Content validation ────────────────────────────────────────────────────
  const validation = validateSkill(data.content, data.slug)
  const safety = quickSafetyCheck(data.content)

  // Block upload on security violations
  const securityErrors = [
    ...validation.errors.filter((e) => e.code === 'SECURITY_VIOLATION'),
    ...safety.issues.map((i) => ({ field: 'content', message: i, code: 'SECURITY_VIOLATION' })),
  ]
  if (securityErrors.length > 0) {
    return NextResponse.json(
      { error: 'Security validation failed', details: securityErrors },
      { status: 422 }
    )
  }

  // Block publishing (but allow draft) if validation errors exist
  if (data.isPublished && validation.errors.length > 0) {
    return NextResponse.json(
      {
        error: 'Fix validation errors before publishing',
        validation: {
          errors: validation.errors,
          warnings: validation.warnings,
        },
      },
      { status: 422 }
    )
  }

  // ── Create skill ──────────────────────────────────────────────────────────
  const [skill] = await db
    .insert(skills)
    .values({
      name: data.name,
      slug: data.slug,
      description: data.description,
      content: data.content,
      readme: data.readme,
      version: data.version,
      category: data.category,
      tags: data.tags,
      priceCents: data.priceCents,
      authorId: user.id,
      isPublished: data.isPublished,
      compatibleWith: data.compatibleWith,
      userInvocable: data.userInvocable,
      homepage: data.homepage || null,
      githubRepo: data.githubRepo || null,
      githubPath: data.githubPath || null,
      githubRef: data.githubRef || null,
      validationStatus: validation.valid ? 'valid' : 'invalid',
      validationErrors: validation.errors.map((e) => `${e.field}: ${e.message}`),
      validationWarnings: validation.warnings.map((w) => `${w.field}: ${w.message}`),
      scanStatus: 'pending',
    })
    .returning()

  // ── Kick off async VirusTotal scan (non-blocking) ─────────────────────────
  submitScan(data.content, `${data.slug}.md`).then(async ({ analysisId, error }) => {
    if (analysisId) {
      await db
        .update(skills)
        .set({ scanId: analysisId, scanStatus: 'pending' })
        .where(eq(skills.id, skill.id))
    } else if (error?.includes('not configured')) {
      // VT not set up — mark as skipped (treated as clean)
      await db
        .update(skills)
        .set({ scanStatus: 'clean' })
        .where(eq(skills.id, skill.id))
    }
  }).catch(() => {
    // Scan failure should not block skill creation
  })

  return NextResponse.json(
    {
      ...skill,
      validation: {
        status: validation.valid ? 'valid' : 'invalid',
        errors: validation.errors,
        warnings: validation.warnings,
      },
    },
    { status: 201 }
  )
}
