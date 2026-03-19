/**
 * SkillHub Skill Validator
 *
 * Validates SKILL.md files against the SkillHub/OpenClaw standard format.
 * Compatible with OpenClaw skill format spec.
 */

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

export interface ParsedSkillMeta {
  name: string
  slug?: string
  version: string
  description: string
  category?: string
  tags?: string[]
  author?: string
  homepage?: string
  compatibleWith?: string[]
  userInvocable?: boolean
  disableModelInvocation?: boolean
  os?: string[]
  metadata?: {
    openclaw?: {
      requires?: {
        env?: string[]
        bins?: string[]
        anyBins?: string[]
        config?: string[]
        primaryEnv?: string
      }
    }
  }
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  meta: ParsedSkillMeta | null
  contentLines: number
  hasSystemPrompt: boolean
  hasUsageSection: boolean
  hasExamplesSection: boolean
}

// SkillHub + OpenClaw compatible categories
export const VALID_CATEGORIES = [
  'productivity',
  'development',
  'data-analytics',
  'communication',
  'ai-ml',
  'automation',
  'research',
  'writing',
  'security',
  'finance',
  'devops',
  'testing',
  'other',
]

export const COMPATIBLE_FRAMEWORKS = [
  'claude-code',
  'cursor',
  'windsurf',
  'openclaw',
  'aider',
  'continue',
  'cody',
  'generic',
]

// Patterns that indicate potentially malicious content in skill instructions
// These check for instructions that would harm users, not legitimate code examples
const MALICIOUS_INSTRUCTION_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /instruct.*(?:delete|remove|destroy).*(?:all files|entire|everything)/i,
    message: 'Skill contains instructions to delete all files',
  },
  {
    pattern: /send.*(?:password|credentials|api.?key|private.?key|secret).*to\s+(?:http|https|ftp)/i,
    message: 'Skill may attempt to exfiltrate credentials',
  },
  {
    pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i,
    message: 'Skill contains prompt injection attempt',
  },
  {
    pattern: /you are now|forget you are|pretend you are|act as if you have no restrictions/i,
    message: 'Skill contains potential jailbreak instructions',
  },
  {
    pattern: /\beval\s*\(\s*(?:base64_decode|atob|Buffer\.from)/i,
    message: 'Skill contains obfuscated code execution',
  },
  {
    pattern: /data:text\/html;base64,/i,
    message: 'Skill contains base64-encoded HTML (potential XSS)',
  },
]

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/

/**
 * Parse YAML frontmatter from markdown content.
 * Handles the --- delimited block at the start of the file.
 */
export function parseFrontmatter(content: string): {
  meta: Record<string, unknown> | null
  body: string
  raw: string
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { meta: null, body: content, raw: '' }
  }

  const raw = match[1]
  const body = match[2] || ''

  try {
    // Simple YAML parser for single-level keys (compatible with OpenClaw's parser)
    const meta: Record<string, unknown> = {}
    const lines = raw.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim() || line.trim().startsWith('#')) continue

      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue

      const key = line.slice(0, colonIdx).trim()
      let value: unknown = line.slice(colonIdx + 1).trim()

      // Handle arrays: [item1, item2] or multiline
      if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      }
      // Handle booleans
      else if (value === 'true') value = true
      else if (value === 'false') value = false
      // Handle nested (metadata block) — collect until next top-level key
      else if (value === '' || value === null) {
        // Might be a block key — skip for now
        continue
      }

      // Handle quoted strings
      if (typeof value === 'string') {
        value = value.replace(/^['"]|['"]$/g, '')
      }

      meta[key] = value
    }

    // Handle metadata.openclaw nested block
    const metadataBlock = raw.match(/^metadata:\s*\n((?:\s+\S.*\n?)*)/m)
    if (metadataBlock) {
      const openclaw = raw.match(/^\s+openclaw:\s*\n((?:\s{4,}\S.*\n?)*)/m)
      if (openclaw) {
        const requires: Record<string, unknown> = {}
        const requiresBlock = raw.match(/^\s+requires:\s*\n((?:\s{6,}\S.*\n?)*)/m)
        if (requiresBlock) {
          requiresBlock[1].split('\n').forEach((line) => {
            const m = line.match(/^\s+(\w+):\s*(.+)$/)
            if (m) {
              const val = m[2].trim()
              if (val.startsWith('[') && val.endsWith(']')) {
                requires[m[1]] = val
                  .slice(1, -1)
                  .split(',')
                  .map((s) => s.trim())
              } else {
                requires[m[1]] = val.replace(/^['"]|['"]$/g, '')
              }
            }
          })
        }
        meta['metadata'] = { openclaw: { requires } }
      }
    }

    return { meta, body, raw }
  } catch {
    return { meta: null, body: content, raw }
  }
}

/**
 * Full skill validation. Returns detailed errors, warnings, and parsed metadata.
 */
export function validateSkill(content: string, slug?: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      errors: [{ field: 'content', message: 'Skill content is empty', code: 'EMPTY_CONTENT' }],
      warnings: [],
      meta: null,
      contentLines: 0,
      hasSystemPrompt: false,
      hasUsageSection: false,
      hasExamplesSection: false,
    }
  }

  // ── Frontmatter parsing ─────────────────────────────────────────────────────
  const { meta: rawMeta, body } = parseFrontmatter(content)

  if (!rawMeta) {
    errors.push({
      field: 'frontmatter',
      message: 'Missing YAML frontmatter. Skills must start with --- delimited YAML.',
      code: 'MISSING_FRONTMATTER',
    })
  }

  const meta = rawMeta as Record<string, unknown> | null

  // ── Required fields ────────────────────────────────────────────────────────
  if (!meta?.name) {
    errors.push({ field: 'name', message: 'name is required', code: 'MISSING_NAME' })
  } else if (typeof meta.name !== 'string' || meta.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'name must be at least 2 characters', code: 'NAME_TOO_SHORT' })
  } else if (meta.name.trim().length > 80) {
    errors.push({ field: 'name', message: 'name must be 80 characters or less', code: 'NAME_TOO_LONG' })
  }

  if (!meta?.description) {
    errors.push({ field: 'description', message: 'description is required', code: 'MISSING_DESCRIPTION' })
  } else if (typeof meta.description === 'string' && meta.description.trim().length < 20) {
    errors.push({
      field: 'description',
      message: 'description must be at least 20 characters',
      code: 'DESCRIPTION_TOO_SHORT',
    })
  } else if (typeof meta.description === 'string' && meta.description.trim().length > 500) {
    errors.push({
      field: 'description',
      message: 'description must be 500 characters or less',
      code: 'DESCRIPTION_TOO_LONG',
    })
  }

  if (!meta?.version) {
    errors.push({ field: 'version', message: 'version is required', code: 'MISSING_VERSION' })
  } else if (!SEMVER_REGEX.test(String(meta.version))) {
    errors.push({
      field: 'version',
      message: 'version must follow semantic versioning (e.g., 1.0.0)',
      code: 'INVALID_VERSION',
    })
  }

  // ── Slug validation ────────────────────────────────────────────────────────
  const effectiveSlug = slug || String(meta?.slug || meta?.name || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  if (effectiveSlug) {
    if (!SLUG_REGEX.test(effectiveSlug)) {
      errors.push({
        field: 'slug',
        message: 'slug must be lowercase and contain only letters, numbers, and hyphens',
        code: 'INVALID_SLUG',
      })
    }
    if (effectiveSlug.length > 80) {
      errors.push({ field: 'slug', message: 'slug must be 80 characters or less', code: 'SLUG_TOO_LONG' })
    }
  }

  // ── Category validation ────────────────────────────────────────────────────
  if (meta?.category) {
    if (!VALID_CATEGORIES.includes(String(meta.category))) {
      warnings.push({
        field: 'category',
        message: `Unknown category "${meta.category}". Valid: ${VALID_CATEGORIES.join(', ')}`,
        code: 'UNKNOWN_CATEGORY',
      })
    }
  } else {
    warnings.push({
      field: 'category',
      message: 'category is recommended for discoverability',
      code: 'MISSING_CATEGORY',
    })
  }

  // ── Compatible frameworks ──────────────────────────────────────────────────
  if (meta?.compatible_with) {
    const frameworks = Array.isArray(meta.compatible_with)
      ? meta.compatible_with
      : [meta.compatible_with]
    const unknownFrameworks = frameworks.filter((f) => !COMPATIBLE_FRAMEWORKS.includes(String(f)))
    if (unknownFrameworks.length > 0) {
      warnings.push({
        field: 'compatible_with',
        message: `Unknown frameworks: ${unknownFrameworks.join(', ')}. Known: ${COMPATIBLE_FRAMEWORKS.join(', ')}`,
        code: 'UNKNOWN_FRAMEWORK',
      })
    }
  } else {
    warnings.push({
      field: 'compatible_with',
      message: 'compatible_with is recommended. Example: [claude-code, cursor, openclaw]',
      code: 'MISSING_COMPATIBLE_WITH',
    })
  }

  // ── Content quality checks ─────────────────────────────────────────────────
  const bodyLines = body.split('\n').length
  const bodyWords = body.trim().split(/\s+/).length

  if (bodyWords < 20) {
    errors.push({
      field: 'content',
      message: 'Skill content body is too short (minimum 20 words of instructions)',
      code: 'CONTENT_TOO_SHORT',
    })
  }

  // ── Section checks ─────────────────────────────────────────────────────────
  const hasH1 = /^#\s+.+/m.test(body)
  const hasSystemPrompt = /^#{1,3}\s+(?:system\s+prompt|instructions?|overview)/im.test(body)
  const hasUsageSection = /^#{1,3}\s+(?:usage|how\s+to\s+use|getting\s+started)/im.test(body)
  const hasExamplesSection = /^#{1,3}\s+(?:examples?|sample|demo)/im.test(body)

  if (!hasH1) {
    warnings.push({
      field: 'content',
      message: 'Add a # Heading at the start of the skill body',
      code: 'MISSING_HEADING',
    })
  }

  if (!hasUsageSection) {
    warnings.push({
      field: 'content',
      message: 'Add a ## Usage section to help users understand how to use this skill',
      code: 'MISSING_USAGE',
    })
  }

  if (!hasExamplesSection) {
    warnings.push({
      field: 'content',
      message: 'Add an ## Examples section with sample prompts and responses',
      code: 'MISSING_EXAMPLES',
    })
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  if (!meta?.tags || (Array.isArray(meta.tags) && meta.tags.length === 0)) {
    warnings.push({
      field: 'tags',
      message: 'Adding tags improves searchability',
      code: 'MISSING_TAGS',
    })
  } else if (Array.isArray(meta.tags) && meta.tags.length > 10) {
    warnings.push({
      field: 'tags',
      message: 'Too many tags (maximum 10 recommended)',
      code: 'TOO_MANY_TAGS',
    })
  }

  // ── Security checks ────────────────────────────────────────────────────────
  for (const { pattern, message } of MALICIOUS_INSTRUCTION_PATTERNS) {
    if (pattern.test(content)) {
      errors.push({
        field: 'content',
        message: `Security issue detected: ${message}`,
        code: 'SECURITY_VIOLATION',
      })
    }
  }

  // Max file size (50MB like OpenClaw, but we enforce 512KB for text skills)
  if (content.length > 512 * 1024) {
    errors.push({
      field: 'content',
      message: 'Skill file is too large (maximum 512KB)',
      code: 'FILE_TOO_LARGE',
    })
  }

  // ── Build parsed meta ──────────────────────────────────────────────────────
  const parsedMeta: ParsedSkillMeta | null = meta
    ? {
        name: String(meta.name || ''),
        slug: effectiveSlug || undefined,
        version: String(meta.version || '1.0.0'),
        description: String(meta.description || ''),
        category: meta.category ? String(meta.category) : undefined,
        tags: Array.isArray(meta.tags) ? meta.tags.map(String) : undefined,
        author: meta.author ? String(meta.author) : undefined,
        homepage: meta.homepage ? String(meta.homepage) : undefined,
        compatibleWith: Array.isArray(meta.compatible_with)
          ? meta.compatible_with.map(String)
          : ['claude-code'],
        userInvocable: meta['user-invocable'] !== false,
        disableModelInvocation: meta['disable-model-invocation'] === true,
        os: Array.isArray(meta.os) ? meta.os.map(String) : undefined,
        metadata: meta.metadata as ParsedSkillMeta['metadata'],
      }
    : null

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    meta: parsedMeta,
    contentLines: bodyLines,
    hasSystemPrompt,
    hasUsageSection,
    hasExamplesSection,
  }
}

/**
 * Generate a standardized SKILL.md template
 */
export function generateSkillTemplate(params: {
  name: string
  slug: string
  description: string
  author: string
  category: string
  tags?: string[]
}): string {
  const { name, slug, description, author, category, tags = [] } = params
  return `---
name: ${name}
slug: ${slug}
version: 1.0.0
description: ${description}
author: ${author}
category: ${category}
tags: [${tags.join(', ')}]
compatible_with: [claude-code, cursor, openclaw, generic]
user-invocable: true
homepage: https://skillhub.dev/skills/${slug}
---

# ${name}

## Overview

${description}

## Instructions

When the user asks you to [describe trigger], you should:

1. [Step one]
2. [Step two]
3. [Step three]

Be thorough and consider edge cases. Always explain your reasoning.

## Usage

Reference this skill in your AI agent:

\`\`\`bash
npx skillhub@latest install ${slug}
\`\`\`

Then in \`CLAUDE.md\` or agent config:
\`\`\`
@.skillhub/skills/${slug}/SKILL.md
\`\`\`

## Examples

### Example 1

**User:** [Example prompt]

**Assistant:** [Expected response showing the skill in action]

### Example 2

**User:** [Another example]

**Assistant:** [Expected response]

## Notes

- [Any important limitations or requirements]
- [Required tools or access]
- [Known edge cases]
`
}
