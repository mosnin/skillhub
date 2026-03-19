/**
 * GitHub Repository Import
 *
 * Supports importing SKILL.md files from public GitHub repositories.
 * Uses the GitHub raw content API (no auth needed for public repos).
 *
 * Supported URL formats:
 *   - https://github.com/user/repo/blob/main/SKILL.md
 *   - https://github.com/user/repo/blob/main/skills/my-skill.md
 *   - https://github.com/user/repo  (auto-detects SKILL.md)
 *   - https://github.com/user/repo/tree/main/skills/  (lists skills)
 *   - user/repo  (shorthand)
 *   - user/repo/path/to/SKILL.md
 */

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com'

export interface GitHubImportResult {
  success: boolean
  content?: string
  error?: string
  repo?: string
  path?: string
  ref?: string
  sha?: string
}

export interface GitHubSkillFile {
  name: string
  path: string
  sha: string
  size: number
  downloadUrl: string
}

/**
 * Parse a GitHub URL or shorthand into owner/repo/path/ref
 */
export function parseGitHubUrl(input: string): {
  owner: string
  repo: string
  path: string
  ref: string
} | null {
  input = input.trim()

  // Full GitHub URL
  if (input.startsWith('https://github.com/') || input.startsWith('http://github.com/')) {
    const url = new URL(input)
    const parts = url.pathname.split('/').filter(Boolean)

    if (parts.length < 2) return null

    const owner = parts[0]
    const repo = parts[1]
    let ref = 'HEAD'
    let path = 'SKILL.md'

    if (parts[2] === 'blob' && parts.length >= 4) {
      ref = parts[3]
      path = parts.slice(4).join('/') || 'SKILL.md'
    } else if (parts[2] === 'tree' && parts.length >= 4) {
      ref = parts[3]
      path = parts.slice(4).join('/') || ''
    }

    return { owner, repo, path, ref }
  }

  // Shorthand: user/repo or user/repo/path/to/file.md
  const parts = input.replace(/^\//, '').split('/')
  if (parts.length < 2) return null

  const owner = parts[0]
  const repo = parts[1]
  const path = parts.length > 2 ? parts.slice(2).join('/') : 'SKILL.md'

  return { owner, repo, path, ref: 'HEAD' }
}

/**
 * Fetch a single SKILL.md file from GitHub
 */
export async function fetchSkillFile(
  owner: string,
  repo: string,
  path: string,
  ref: string = 'HEAD'
): Promise<GitHubImportResult> {
  // Use GitHub API to get file metadata (includes SHA)
  const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}${ref !== 'HEAD' ? `?ref=${ref}` : ''}`

  try {
    const metaRes = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SkillHub/1.0',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    })

    if (metaRes.status === 404) {
      return { success: false, error: `File not found: ${path} in ${owner}/${repo}` }
    }

    if (metaRes.status === 403) {
      return {
        success: false,
        error: 'Rate limited by GitHub. Try again later or provide a GITHUB_TOKEN.',
      }
    }

    if (!metaRes.ok) {
      return { success: false, error: `GitHub API error: ${metaRes.status}` }
    }

    const meta = await metaRes.json()

    if (Array.isArray(meta)) {
      // It's a directory — look for SKILL.md
      return fetchSkillFile(owner, repo, `${path}/SKILL.md`, ref)
    }

    if (meta.type !== 'file') {
      return { success: false, error: `${path} is not a file` }
    }

    if (meta.size > 512 * 1024) {
      return { success: false, error: 'File is too large (max 512KB)' }
    }

    // Fetch raw content
    const rawUrl = `${GITHUB_RAW_BASE}/${owner}/${repo}/${meta.sha}/${path}`
    const rawRes = await fetch(rawUrl, {
      headers: { 'User-Agent': 'SkillHub/1.0' },
    })

    if (!rawRes.ok) {
      // Fallback to download_url from API response
      if (meta.download_url) {
        const dlRes = await fetch(meta.download_url, {
          headers: { 'User-Agent': 'SkillHub/1.0' },
        })
        if (!dlRes.ok) {
          return { success: false, error: 'Failed to download file content' }
        }
        const content = await dlRes.text()
        return {
          success: true,
          content,
          repo: `${owner}/${repo}`,
          path,
          ref: meta.sha,
          sha: meta.sha,
        }
      }
      return { success: false, error: 'Failed to fetch raw file' }
    }

    const content = await rawRes.text()

    // Verify it looks like a SKILL.md (has frontmatter)
    if (!content.trim().startsWith('---')) {
      return {
        success: false,
        error: 'File does not appear to be a valid SKILL.md (missing YAML frontmatter)',
      }
    }

    return {
      success: true,
      content,
      repo: `${owner}/${repo}`,
      path,
      ref: meta.sha,
      sha: meta.sha,
    }
  } catch (e: any) {
    return { success: false, error: `Network error: ${e.message}` }
  }
}

/**
 * List skill files in a GitHub directory
 */
export async function listSkillFiles(
  owner: string,
  repo: string,
  path: string = '',
  ref: string = 'HEAD'
): Promise<{ files: GitHubSkillFile[]; error?: string }> {
  const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}${ref !== 'HEAD' ? `?ref=${ref}` : ''}`

  try {
    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'SkillHub/1.0',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    })

    if (!res.ok) {
      return { files: [], error: `GitHub API error: ${res.status}` }
    }

    const items = await res.json()
    if (!Array.isArray(items)) {
      return { files: [], error: 'Expected a directory' }
    }

    const skillFiles: GitHubSkillFile[] = items
      .filter(
        (item: any) =>
          item.type === 'file' &&
          (item.name === 'SKILL.md' ||
            item.name.endsWith('.skill.md') ||
            item.name.endsWith('-skill.md')) &&
          item.size < 512 * 1024
      )
      .map((item: any) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        downloadUrl: item.download_url,
      }))

    // Also check subdirectories for SKILL.md
    const dirs = items.filter(
      (item: any) => item.type === 'dir' && !item.name.startsWith('.')
    )

    for (const dir of dirs.slice(0, 10)) {
      // Limit to 10 subdirs
      try {
        const subRes = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${dir.path}`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'User-Agent': 'SkillHub/1.0',
              ...(process.env.GITHUB_TOKEN
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
                : {}),
            },
          }
        )
        if (subRes.ok) {
          const subItems = await subRes.json()
          if (Array.isArray(subItems)) {
            const subSkills = subItems
              .filter(
                (item: any) =>
                  item.type === 'file' &&
                  (item.name === 'SKILL.md' || item.name.endsWith('.skill.md')) &&
                  item.size < 512 * 1024
              )
              .map((item: any) => ({
                name: item.name,
                path: item.path,
                sha: item.sha,
                size: item.size,
                downloadUrl: item.download_url,
              }))
            skillFiles.push(...subSkills)
          }
        }
      } catch {
        // Skip failed subdirs
      }
    }

    return { files: skillFiles }
  } catch (e: any) {
    return { files: [], error: `Network error: ${e.message}` }
  }
}

/**
 * Import a skill from a GitHub URL. Auto-detects if it's a file or directory.
 */
export async function importFromGitHub(input: string): Promise<GitHubImportResult> {
  const parsed = parseGitHubUrl(input)
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid GitHub URL. Supported formats: https://github.com/user/repo/blob/main/SKILL.md or user/repo',
    }
  }

  const { owner, repo, path, ref } = parsed

  // If path looks like a directory (no extension or ends with /)
  if (!path || path.endsWith('/') || !path.includes('.')) {
    const { files, error } = await listSkillFiles(owner, repo, path || '', ref)

    if (error) return { success: false, error }

    if (files.length === 0) {
      return {
        success: false,
        error: `No SKILL.md files found in ${owner}/${repo}/${path}. Make sure the repo has a SKILL.md file.`,
      }
    }

    // Return the first skill found (or root SKILL.md)
    const rootSkill = files.find((f) => f.path === 'SKILL.md' || f.path === `${path}/SKILL.md`)
    const targetFile = rootSkill || files[0]

    return fetchSkillFile(owner, repo, targetFile.path, ref)
  }

  return fetchSkillFile(owner, repo, path, ref)
}
