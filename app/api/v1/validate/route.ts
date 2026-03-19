import { NextRequest, NextResponse } from 'next/server'
import { validateSkill, parseFrontmatter } from '@/lib/skill-validator'
import { quickSafetyCheck } from '@/lib/virustotal'
import { z } from 'zod'

const schema = z.object({
  content: z.string().min(1).max(524288),
  slug: z.string().optional(),
})

/**
 * POST /api/v1/validate
 * Validate a SKILL.md content before uploading.
 * Returns validation errors, warnings, and parsed metadata.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { content, slug } = parsed.data

  // Run structural validation
  const validation = validateSkill(content, slug)

  // Run quick safety check (no API calls)
  const safety = quickSafetyCheck(content)
  if (!safety.safe) {
    for (const issue of safety.issues) {
      validation.errors.push({
        field: 'content',
        message: issue,
        code: 'SECURITY_VIOLATION',
      })
      validation.valid = false
    }
  }

  return NextResponse.json({
    valid: validation.valid,
    errors: validation.errors,
    warnings: validation.warnings,
    meta: validation.meta,
    analysis: {
      content_lines: validation.contentLines,
      has_system_prompt: validation.hasSystemPrompt,
      has_usage_section: validation.hasUsageSection,
      has_examples_section: validation.hasExamplesSection,
    },
  })
}
