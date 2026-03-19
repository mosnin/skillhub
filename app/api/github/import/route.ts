import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { importFromGitHub, listSkillFiles, parseGitHubUrl } from '@/lib/github-import'
import { validateSkill } from '@/lib/skill-validator'
import { z } from 'zod'

const schema = z.object({
  url: z.string().min(1),
  listOnly: z.boolean().optional().default(false),
})

/**
 * POST /api/github/import
 *
 * Import a SKILL.md from a public GitHub repository.
 * Returns parsed content and validation results.
 */
export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { url, listOnly } = parsed.data

  // If listOnly, just return available skill files in the repo
  if (listOnly) {
    const parsedUrl = parseGitHubUrl(url)
    if (!parsedUrl) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const { files, error } = await listSkillFiles(
      parsedUrl.owner,
      parsedUrl.repo,
      parsedUrl.path.endsWith('.md') ? '' : parsedUrl.path,
      parsedUrl.ref
    )

    if (error) return NextResponse.json({ error }, { status: 400 })

    return NextResponse.json({
      repo: `${parsedUrl.owner}/${parsedUrl.repo}`,
      files: files.map((f) => ({
        path: f.path,
        name: f.name,
        size: f.size,
        url: `https://github.com/${parsedUrl.owner}/${parsedUrl.repo}/blob/${parsedUrl.ref}/${f.path}`,
      })),
    })
  }

  // Import specific file
  const result = await importFromGitHub(url)

  if (!result.success || !result.content) {
    return NextResponse.json({ error: result.error || 'Import failed' }, { status: 400 })
  }

  // Validate the imported content
  const validation = validateSkill(result.content)

  return NextResponse.json({
    success: true,
    content: result.content,
    repo: result.repo,
    path: result.path,
    ref: result.ref,
    validation: {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      meta: validation.meta,
    },
  })
}
