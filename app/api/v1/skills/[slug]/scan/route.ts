import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAnalysis } from '@/lib/virustotal'
import { sendEmail, scanCompleteEmail } from '@/lib/email'

/**
 * GET /api/v1/skills/:slug/scan
 * Returns security scan results for a skill.
 * If a scan is pending, polls VirusTotal for updated results.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.slug, params.slug), eq(skills.isPublished, true)),
  })

  if (!skill) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If pending and we have a scan ID, poll VT
  if (skill.scanStatus === 'pending' && skill.scanId) {
    const result = await getAnalysis(skill.scanId)

    if (result.status !== 'pending') {
      const newScanStatus = result.status === 'flagged' ? 'flagged' : 'clean'

      await db
        .update(skills)
        .set({
          scanStatus: newScanStatus,
          scanResults: result as any,
          scanCompletedAt: new Date(),
          // Suspend if flagged by multiple engines
          isSuspended: result.status === 'flagged' && (result.stats?.malicious || 0) > 2,
        })
        .where(eq(skills.id, skill.id))

      // Send email notification to author — non-blocking
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillhub.dev'
      db.query.users
        .findFirst({ where: eq(users.id, skill.authorId) })
        .then((author) => {
          if (author?.email) {
            sendEmail(
              scanCompleteEmail({
                to: author.email,
                skillName: skill.name,
                skillSlug: skill.slug,
                status: newScanStatus as 'clean' | 'flagged',
                appUrl,
              })
            )
          }
        })
        .catch(() => {
          // Ignore email errors — don't affect the response
        })

      return NextResponse.json({
        slug: skill.slug,
        scan_status: result.status,
        stats: result.stats,
        permalink: result.permalink,
        detected_by: result.detectedBy,
        completed_at: result.completedAt,
      })
    }
  }

  return NextResponse.json({
    slug: skill.slug,
    scan_status: skill.scanStatus,
    stats: (skill.scanResults as any)?.stats || null,
    permalink: (skill.scanResults as any)?.permalink || null,
    detected_by: (skill.scanResults as any)?.detectedBy || [],
    completed_at: skill.scanCompletedAt,
  })
}
