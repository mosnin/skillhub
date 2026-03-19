import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

function isAdmin(userId: string | null): boolean {
  if (!userId) return false
  const adminIds = process.env.ADMIN_CLERK_IDS?.split(',').map(id => id.trim()) || []
  return adminIds.includes(userId)
}

const updateSchema = z.object({
  isSuspended: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  adminNote: z.string().max(500).optional(),
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
    adminNote: string
    updatedAt: Date
  }> = {
    ...(updates.isSuspended !== undefined ? { isSuspended: updates.isSuspended } : {}),
    ...(updates.isFeatured !== undefined ? { isFeatured: updates.isFeatured } : {}),
    ...(updates.isPublished !== undefined ? { isPublished: updates.isPublished } : {}),
    ...(updates.adminNote !== undefined ? { adminNote: updates.adminNote } : {}),
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

  // Send email to skill author when adminNote is provided
  if (updates.adminNote) {
    try {
      const author = await db
        .select({ email: users.email, username: users.username })
        .from(users)
        .where(eq(users.id, updated.authorId))
        .limit(1)

      if (author[0]) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillhub.dev'
        const skillUrl = `${appUrl}/skills/${updated.slug}`
        const subject = updates.isSuspended
          ? `Your skill "${updated.name}" has been suspended`
          : `Admin note on your skill "${updated.name}"`

        const actionLine = updates.isSuspended
          ? `<p style="font-size:15px;color:#a0a0a0;line-height:1.6;margin:0 0 16px;">Your skill has been suspended from the marketplace. Please review the note below and contact support if you have questions.</p>`
          : `<p style="font-size:15px;color:#a0a0a0;line-height:1.6;margin:0 0 16px;">An administrator has left a note regarding your skill <span style="color:#ffffff;font-weight:600;">${updated.name}</span>.</p>`

        const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">
      <a href="${appUrl}" style="font-size:22px;font-weight:700;color:#a855f7;margin-bottom:24px;display:block;text-decoration:none;">SkillHub</a>
      <h1 style="font-size:24px;font-weight:700;color:#ffffff;margin:0 0 8px;">${updates.isSuspended ? 'Skill Suspended' : 'Admin Note'}</h1>
      ${actionLine}
      <div style="background-color:#111111;border-left:3px solid #a855f7;border-radius:0 6px 6px 0;padding:14px 16px;margin:16px 0;">
        <p style="font-size:13px;font-weight:600;color:#a855f7;margin:0 0 6px;">Message from the SkillHub team</p>
        <p style="font-size:14px;color:#d4d4d4;line-height:1.6;margin:0;white-space:pre-wrap;">${updates.adminNote}</p>
      </div>
      <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;">
      <a href="${skillUrl}" style="display:inline-block;padding:12px 24px;background-color:#a855f7;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;margin-top:8px;">View Skill</a>
    </div>
    <p style="font-size:12px;color:#555555;text-align:center;margin-top:24px;">
      You received this email because you published a skill on SkillHub.<br>
      &copy; ${new Date().getFullYear()} SkillHub. All rights reserved.
    </p>
  </div>
</body>
</html>`

        await sendEmail({ to: author[0].email, subject, html })
      }
    } catch (emailErr) {
      // Don't fail the request if email sending errors
      console.error('[Admin skill update] Failed to send email:', emailErr)
    }
  }

  return NextResponse.json({ skill: updated })
}
