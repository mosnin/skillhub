import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

function isAdmin(userId: string | null): boolean {
  if (!userId) return false
  const adminIds = process.env.ADMIN_CLERK_IDS?.split(',').map(id => id.trim()) || []
  return adminIds.includes(userId)
}

const updateSchema = z.object({
  isSuspended: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()

  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updates = parsed.data

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const updatePayload: Partial<{
    isSuspended: boolean
    isFeatured: boolean
    isPublished: boolean
    updatedAt: Date
  }> = {
    ...updates,
    updatedAt: new Date(),
  }

  const [updated] = await db
    .update(skills)
    .set(updatePayload)
    .where(eq(skills.id, params.id))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  return NextResponse.json({ skill: updated })
}
