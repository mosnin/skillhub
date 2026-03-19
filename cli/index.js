#!/usr/bin/env node

/**
 * SkillHub CLI
 *
 * The marketplace for AI agent skills. Compatible with OpenClaw skill format.
 *
 * Usage: npx skillhub@latest <command> [args]
 *
 * Commands:
 *   install <slug>         Install a skill (project or global)
 *   uninstall <slug>       Remove a skill
 *   list                   List installed skills
 *   search <query>         Search the marketplace
 *   inspect <slug>         Preview a skill without installing
 *   update [slug]          Update skill(s)
 *   publish <path>         Publish a skill to the marketplace
 *   validate <path>        Validate a SKILL.md locally
 *   whoami                 Show authenticated user info
 *   info                   Show CLI config
 *
 * Agent integration:
 *   Installed skills land in .skillhub/skills/<slug>/SKILL.md
 *   Reference in CLAUDE.md: @.skillhub/skills/<slug>/SKILL.md
 *   Reference in .cursorrules: see skill file path
 *
 * OpenClaw compatibility:
 *   Skills follow the OpenClaw SKILL.md format
 *   Frontmatter fields: name, description, version, compatible_with, ...
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const http = require('http')

const API_BASE = process.env.SKILLHUB_API_URL || 'https://skillhub.dev'
const VERSION = '0.1.0'

// ─── Terminal colors ──────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
}
const c = (color, text) => `${C[color]}${text}${C.reset}`

const log = (...a) => console.log(...a)
const err = (...a) => console.error(c('red', '✗'), ...a)
const ok = (...a) => console.log(c('green', '✓'), ...a)
const info = (...a) => console.log(c('cyan', 'ℹ'), ...a)
const warn = (...a) => console.log(c('yellow', '⚠'), ...a)

// ─── HTTP fetch (no dependencies) ────────────────────────────────────────────
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === 'https:' ? https : http
    const body = options.body
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': `skillhub-cli/${VERSION}`,
      ...options.headers,
    }
    if (body && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(body)
    }

    const req = lib.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () =>
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => {
              try { return JSON.parse(data) } catch { return null }
            },
            text: () => data,
          })
        )
      }
    )
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// ─── Local storage helpers ────────────────────────────────────────────────────
const getBase = (global) =>
  global ? path.join(os.homedir(), '.skillhub') : path.join(process.cwd(), '.skillhub')

const getSkillsDir = (global) => path.join(getBase(global), 'skills')
const getIndexPath = (global) => path.join(getBase(global), 'index.json')

function readIndex(global = false) {
  try {
    return JSON.parse(fs.readFileSync(getIndexPath(global), 'utf8'))
  } catch {
    return {}
  }
}

function writeIndex(index, global = false) {
  const p = getIndexPath(global)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(index, null, 2))
}

function getApiKey(options = {}) {
  return options.key || process.env.SKILLHUB_API_KEY
}

// ─── Frontmatter parser (mirrors server-side logic) ──────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const meta = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    let val = line.slice(colonIdx + 1).trim()
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    } else if (val === 'true') val = true
    else if (val === 'false') val = false
    else val = val.replace(/^['"]|['"]$/g, '')
    meta[key] = val
  }
  return meta
}

// ─── Parse CLI args ───────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2)
  const options = {}
  const positional = []
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('-')) { options[key] = next; i++ }
      else options[key] = true
    } else if (args[i].startsWith('-') && args[i].length === 2) {
      const key = args[i].slice(1)
      const next = args[i + 1]
      if (next && !next.startsWith('-')) { options[key] = next; i++ }
      else options[key] = true
    } else {
      positional.push(args[i])
    }
  }
  return { positional, options }
}

// ─── Discovery ────────────────────────────────────────────────────────────────
async function getDiscovery() {
  try {
    const res = await fetch(`${API_BASE}/.well-known/skillhub.json`)
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

// ─── COMMANDS ─────────────────────────────────────────────────────────────────

async function cmdInstall(slug, options = {}) {
  if (!slug) { err('Provide a skill slug: skillhub install <slug>'); process.exit(1) }

  const isGlobal = !!(options.global || options.g)
  const apiKey = getApiKey(options)

  log(`${c('cyan', '⬇')} Installing ${c('bold', slug)}...`)

  // Check if already installed
  const existing = readIndex(isGlobal)[slug]
  if (existing && !options.force) {
    warn(`${slug} is already installed (v${existing.version}). Use --force to reinstall.`)
  }

  // Fetch metadata
  let skillMeta
  try {
    const res = await fetch(`${API_BASE}/api/v1/skills/${slug}`)
    if (res.status === 404) {
      err(`Skill "${slug}" not found`)
      log()
      log(`  Search: ${c('cyan', `npx skillhub@latest search ${slug}`)}`)
      log(`  Browse: ${c('cyan', `${API_BASE}/marketplace`)}`)
      process.exit(1)
    }
    if (!res.ok) { err(`API error ${res.status}`); process.exit(1) }
    skillMeta = res.json()
  } catch (e) {
    err(`Cannot reach SkillHub (${API_BASE}): ${e.message}`)
    process.exit(1)
  }

  // Security check
  if (skillMeta?.security?.scan_status === 'flagged') {
    err(`Security: This skill has been flagged by antivirus engines and is not safe to install.`)
    process.exit(1)
  }
  if (skillMeta?.security?.scan_status === 'pending') {
    warn(`Security scan is still pending for this skill. Install anyway? (--force to skip warning)`)
    if (!options.force) {
      log(`  Recheck: ${c('cyan', `npx skillhub@latest inspect ${slug}`)}`)
    }
  }

  // Paid skill check
  if (skillMeta?.price?.cents > 0 && !apiKey) {
    err(`This skill costs ${skillMeta.price.formatted} and requires a purchase.`)
    log()
    log(`  ${c('yellow', '1.')} Purchase: ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
    log(`  ${c('yellow', '2.')} API keys: ${c('cyan', `${API_BASE}/dashboard/api-keys`)}`)
    log(`  ${c('yellow', '3.')} Install:  ${c('cyan', `SKILLHUB_API_KEY=sh_xxx npx skillhub@latest install ${slug}`)}`)
    process.exit(1)
  }

  // Fetch content
  let content, name, version
  try {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
    const res = await fetch(`${API_BASE}/api/v1/skills/${slug}/content`, { headers })

    if (res.status === 401) {
      err('Invalid API key')
      process.exit(1)
    }
    if (res.status === 402) {
      const data = res.json()
      err(`Payment required: ${data?.purchase_url || `${API_BASE}/skills/${slug}`}`)
      process.exit(1)
    }
    if (!res.ok) { err(`Failed to download skill (${res.status})`); process.exit(1) }

    const data = res.json()
    content = data.content
    name = data.name
    version = data.version
  } catch (e) {
    err(`Download failed: ${e.message}`)
    process.exit(1)
  }

  // Write file
  const skillsDir = getSkillsDir(isGlobal)
  const skillDir = path.join(skillsDir, slug)
  const skillFile = path.join(skillDir, 'SKILL.md')
  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillFile, content)

  // Update index
  const index = readIndex(isGlobal)
  index[slug] = {
    name,
    version,
    slug,
    installedAt: new Date().toISOString(),
    path: skillFile,
    paid: (skillMeta?.price?.cents || 0) > 0,
    compatibleWith: skillMeta?.compatible_with || ['claude-code'],
  }
  writeIndex(index, isGlobal)

  log()
  ok(`Installed ${c('bold', name)} ${c('gray', `v${version}`)}`)
  log(`  ${c('dim', '→')} ${skillFile}`)
  log()

  // Show agent integration hints
  const compatibleWith = skillMeta?.compatible_with || ['claude-code']
  log(c('bold', 'Agent integration:'))

  if (compatibleWith.includes('claude-code') || compatibleWith.includes('generic')) {
    log(`  ${c('dim', 'Claude Code')} — add to CLAUDE.md:`)
    log(`    ${c('cyan', `@${isGlobal ? `~/.skillhub/skills/${slug}/SKILL.md` : `.skillhub/skills/${slug}/SKILL.md`}`)}`)
  }

  if (compatibleWith.includes('cursor')) {
    log(`  ${c('dim', 'Cursor')} — add to .cursorrules:`)
    log(`    ${c('cyan', `@.skillhub/skills/${slug}/SKILL.md`)}`)
  }

  if (compatibleWith.includes('openclaw')) {
    log(`  ${c('dim', 'OpenClaw')} — this skill is OpenClaw compatible`)
  }

  if (skillMeta?.['user-invocable'] !== false) {
    log(`  ${c('dim', 'Slash command')} — this skill can be invoked with /${slug}`)
  }
}

async function cmdUninstall(slug, options = {}) {
  if (!slug) { err('Provide a slug: skillhub uninstall <slug>'); process.exit(1) }
  const isGlobal = !!(options.global || options.g)
  const skillDir = path.join(getSkillsDir(isGlobal), slug)

  if (!fs.existsSync(skillDir)) {
    warn(`"${slug}" not installed ${isGlobal ? 'globally' : 'in this project'}`)
    return
  }
  fs.rmSync(skillDir, { recursive: true, force: true })
  const index = readIndex(isGlobal)
  delete index[slug]
  writeIndex(index, isGlobal)
  ok(`Uninstalled ${c('bold', slug)}`)
}

async function cmdList(options = {}) {
  const isGlobal = !!(options.global || options.g)
  const local = Object.values(readIndex(false)).map((s) => ({ ...s, scope: 'project' }))
  const global_ = isGlobal ? Object.values(readIndex(true)).map((s) => ({ ...s, scope: 'global' })) : []
  const all = [...local, ...global_]

  if (all.length === 0) {
    log(c('dim', 'No skills installed.'))
    log()
    log(`Browse: ${c('cyan', `${API_BASE}/marketplace`)}`)
    log(`Install: ${c('cyan', 'npx skillhub@latest install <slug>')}`)
    return
  }

  log()
  log(c('bold', `Installed Skills (${all.length})`))
  log()

  for (const s of all) {
    const scope = s.scope === 'global' ? c('blue', '[global]') : c('gray', '[project]')
    const frameworks = (s.compatibleWith || []).join(', ')
    log(`  ${c('green', '●')} ${c('bold', s.name || s.slug)} ${c('dim', `v${s.version}`)} ${scope}`)
    if (frameworks) log(`     ${c('dim', 'frameworks:')} ${c('gray', frameworks)}`)
    log(`     ${c('dim', s.path)}`)
  }
}

async function cmdSearch(query, options = {}) {
  if (!query) { err('Provide a query: skillhub search <query>'); process.exit(1) }

  const compatible = options.compatible || options.c
  let url = `${API_BASE}/api/v1/skills?q=${encodeURIComponent(query)}&limit=10`
  if (compatible) url += `&compatible_with=${encodeURIComponent(compatible)}`

  log(c('dim', `Searching for "${query}"${compatible ? ` (compatible with ${compatible})` : ''}...`))
  log()

  let data
  try {
    const res = await fetch(url)
    data = res.json()
  } catch { err('Search failed'); process.exit(1) }

  const results = data?.data || []
  if (!results.length) {
    log(c('dim', `No skills found for "${query}"`))
    log(`Browse all: ${c('cyan', `${API_BASE}/marketplace`)}`)
    return
  }

  log(c('bold', `${data.meta?.total || results.length} result${results.length !== 1 ? 's' : ''}`))
  log()

  for (const s of results) {
    const price = s.price?.free ? c('green', 'Free') : c('yellow', s.price?.formatted || '')
    const security = s.security?.scan_status === 'clean'
      ? c('green', '✓ safe')
      : s.security?.scan_status === 'flagged'
      ? c('red', '✗ flagged')
      : c('gray', '⏳ scanning')

    log(`  ${c('cyan', s.slug)} ${c('dim', `v${s.version}`)} ${price} ${c('gray', security)}`)
    log(`  ${c('bold', s.name)}`)
    log(`  ${c('dim', s.description)}`)
    log(`  ${c('gray', `by ${s.author?.username}`)} · ${c('dim', `${s.downloads} downloads`)}`)
    if (s.compatible_with?.length) {
      log(`  ${c('dim', 'works with:')} ${c('gray', s.compatible_with.join(', '))}`)
    }
    log()
  }

  log(`Install: ${c('cyan', 'npx skillhub@latest install <slug>')}`)
}

async function cmdInspect(slug, options = {}) {
  if (!slug) { err('Provide a slug: skillhub inspect <slug>'); process.exit(1) }

  let skill
  try {
    const res = await fetch(`${API_BASE}/api/v1/skills/${slug}`)
    if (!res.ok) { err(`Skill "${slug}" not found`); process.exit(1) }
    skill = res.json()
  } catch { err('Failed to fetch skill'); process.exit(1) }

  log()
  log(c('bold', skill.name) + ' ' + c('dim', `v${skill.version}`))
  log(c('dim', '─'.repeat(50)))
  log()
  log(skill.description)
  log()
  log(`${c('dim', 'Author:')}     ${skill.author?.username || 'unknown'}`)
  log(`${c('dim', 'Category:')}   ${skill.category}`)
  log(`${c('dim', 'Tags:')}       ${(skill.tags || []).join(', ') || 'none'}`)
  log(`${c('dim', 'Downloads:')}  ${skill.downloads}`)
  log(`${c('dim', 'Price:')}      ${skill.price?.free ? c('green', 'Free') : c('yellow', skill.price?.formatted || '')}`)
  log(`${c('dim', 'Works with:')} ${(skill.compatible_with || []).join(', ')}`)
  log(`${c('dim', 'Security:')}   ${
    skill.security?.scan_status === 'clean' ? c('green', '✓ Clean (VirusTotal scanned)')
    : skill.security?.scan_status === 'flagged' ? c('red', '✗ FLAGGED — do not install')
    : c('yellow', '⏳ Scan pending')
  }`)
  log(`${c('dim', 'Invocable:')}  ${skill['user-invocable'] !== false ? 'Yes (slash command)' : 'No'}`)
  log()
  log(`Details: ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
  log(`Install: ${c('cyan', `npx skillhub@latest install ${slug}`)}`)
  if (skill.price?.cents > 0) {
    log(`Buy:     ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
  }
}

async function cmdValidate(filePath, options = {}) {
  const target = path.resolve(filePath || './SKILL.md')
  if (!fs.existsSync(target)) {
    err(`File not found: ${target}`)
    process.exit(1)
  }

  const content = fs.readFileSync(target, 'utf8')
  log(c('dim', `Validating ${target}...`))
  log()

  // Local validation (parse frontmatter)
  const meta = parseFrontmatter(content)
  if (!meta) {
    err('Missing YAML frontmatter (must start with ---)')
    process.exit(1)
  }

  const errors = []
  const warnings = []

  if (!meta.name) errors.push('name is required')
  if (!meta.description) errors.push('description is required')
  if (!meta.version) errors.push('version is required')
  else if (!/^\d+\.\d+\.\d+/.test(meta.version)) errors.push('version must be semver (e.g., 1.0.0)')
  if (!meta.category) warnings.push('category is recommended')
  if (!meta.compatible_with) warnings.push('compatible_with is recommended (e.g., [claude-code, openclaw])')
  if (!meta.tags || (Array.isArray(meta.tags) && meta.tags.length === 0)) warnings.push('tags improve discoverability')

  const body = content.replace(/^---[\s\S]*?---/, '').trim()
  if (body.split(/\s+/).length < 20) errors.push('Content body is too short (min 20 words)')
  if (!/^#{1,3}\s+usage/im.test(body)) warnings.push('Add a ## Usage section')
  if (!/^#{1,3}\s+example/im.test(body)) warnings.push('Add an ## Examples section')

  if (errors.length) {
    log(c('red', `✗ ${errors.length} error${errors.length !== 1 ? 's' : ''}`))
    for (const e of errors) log(`  ${c('red', '✗')} ${e}`)
    log()
  }

  if (warnings.length) {
    log(c('yellow', `⚠ ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`))
    for (const w of warnings) log(`  ${c('yellow', '⚠')} ${w}`)
    log()
  }

  if (!errors.length) {
    ok('Validation passed!')
    log()
    log(`${c('dim', 'Skill:')}  ${meta.name} v${meta.version}`)
    log(`${c('dim', 'Slug:')}   ${meta.slug || '[auto-generated from name]'}`)
    if (meta.compatible_with) {
      log(`${c('dim', 'Works with:')} ${Array.isArray(meta.compatible_with) ? meta.compatible_with.join(', ') : meta.compatible_with}`)
    }
    log()
    log(`Publish: ${c('cyan', `SKILLHUB_API_KEY=sh_xxx npx skillhub@latest publish ${filePath || './SKILL.md'}`)}`)
  } else {
    err('Validation failed. Fix errors before publishing.')
    process.exit(1)
  }

  // Also validate via API if --remote flag set
  if (options.remote) {
    log()
    log(c('dim', 'Running remote validation (server-side)...'))
    try {
      const res = await fetch(`${API_BASE}/api/v1/validate`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      const data = res.json()
      if (data.errors?.length) {
        warn('Remote validation found additional issues:')
        for (const e of data.errors) log(`  ${c('red', '✗')} ${e.field}: ${e.message}`)
      } else {
        ok('Remote validation passed!')
      }
    } catch {
      warn('Could not reach SkillHub API for remote validation')
    }
  }
}

async function cmdPublish(filePath, options = {}) {
  const apiKey = getApiKey(options)
  if (!apiKey) {
    err('API key required to publish')
    log()
    log(`  Get your API key: ${c('cyan', `${API_BASE}/dashboard/api-keys`)}`)
    log(`  Then: ${c('cyan', `SKILLHUB_API_KEY=sh_xxx npx skillhub@latest publish ./SKILL.md`)}`)
    process.exit(1)
  }

  const target = path.resolve(filePath || './SKILL.md')
  if (!fs.existsSync(target)) { err(`File not found: ${target}`); process.exit(1) }

  const content = fs.readFileSync(target, 'utf8')
  const meta = parseFrontmatter(content)

  if (!meta) {
    err('Missing YAML frontmatter')
    process.exit(1)
  }

  const { name, slug, description, category, version = '1.0.0', tags = [], compatible_with } = meta

  if (!name || !description) {
    err('frontmatter must include: name, description')
    log('Run validation first:', c('cyan', `npx skillhub@latest validate ${filePath || './SKILL.md'}`))
    process.exit(1)
  }

  const effectiveSlug = slug ||
    name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  log(c('dim', `Publishing ${c('bold', name)} as "${effectiveSlug}"...`))

  try {
    const res = await fetch(`${API_BASE}/api/skills`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        name,
        slug: effectiveSlug,
        description,
        category: category || 'other',
        tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
        version,
        content,
        isPublished: !options.draft,
        compatibleWith: Array.isArray(compatible_with) ? compatible_with : ['claude-code'],
      }),
    })

    const data = res.json()

    if (res.ok) {
      log()
      ok(`Published ${c('bold', name)}!`)
      log(`  ${c('dim', '→')} ${c('cyan', `${API_BASE}/skills/${effectiveSlug}`)}`)
      log()
      log(`Install command: ${c('cyan', `npx skillhub@latest install ${effectiveSlug}`)}`)
      if (options.draft) log(c('yellow', '  Saved as draft. Run without --draft to publish.'))
    } else if (res.status === 409) {
      // Already exists — update
      const upRes = await fetch(`${API_BASE}/api/skills/${effectiveSlug}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ content, version }),
      })
      if (upRes.ok) {
        ok(`Updated ${c('bold', name)} to v${version}`)
        log(`  ${c('dim', '→')} ${c('cyan', `${API_BASE}/skills/${effectiveSlug}`)}`)
      } else {
        err('Update failed:', upRes.json()?.error)
        process.exit(1)
      }
    } else if (res.status === 422 && data?.validation) {
      err('Validation errors:')
      for (const e of data.validation.errors) {
        log(`  ${c('red', '✗')} ${e.field}: ${e.message}`)
      }
      process.exit(1)
    } else {
      err('Publish failed:', data?.error || 'Unknown error')
      process.exit(1)
    }
  } catch (e) {
    err('Publish failed:', e.message)
    process.exit(1)
  }
}

async function cmdUpdate(slug, options = {}) {
  const isGlobal = !!(options.global || options.g)
  const index = readIndex(isGlobal)
  const toUpdate = slug ? [slug] : Object.keys(index)

  if (!toUpdate.length) { log(c('dim', 'No skills installed')); return }
  log(`Updating ${toUpdate.length} skill${toUpdate.length !== 1 ? 's' : ''}...`)

  for (const s of toUpdate) {
    if (!index[s]) { warn(`"${s}" not installed`); continue }
    await cmdInstall(s, { ...options, force: true, global: isGlobal })
  }
}

async function cmdWhoami(options = {}) {
  const apiKey = getApiKey(options)
  if (!apiKey) {
    err('No API key. Set SKILLHUB_API_KEY or use --key')
    process.exit(1)
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/whoami`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      err('Invalid API key')
      process.exit(1)
    }
    const data = res.json()
    const u = data.user
    log()
    log(c('bold', u.username))
    log(`  ${c('dim', 'Email:')}    ${u.email}`)
    log(`  ${c('dim', 'Skills:')}   ${u.skills_count}`)
    log(`  ${c('dim', 'Earnings:')} $${(u.total_earnings_cents / 100).toFixed(2)}`)
    log(`  ${c('dim', 'Stripe:')}   ${u.stripe_connected ? c('green', 'connected') : c('yellow', 'not connected')}`)
    log(`  ${c('dim', 'Key:')}      ${data.key.name}`)
    log()
  } catch (e) {
    err('Failed:', e.message)
    process.exit(1)
  }
}

async function cmdInfo() {
  const discovery = await getDiscovery()
  log()
  log(c('bold', `SkillHub CLI v${VERSION}`))
  log(c('dim', 'The AI Agent Skills Marketplace'))
  log()
  log(`${c('dim', 'API:')}      ${API_BASE}`)
  if (process.env.SKILLHUB_API_KEY) {
    log(`${c('dim', 'API key:')} ${process.env.SKILLHUB_API_KEY.slice(0, 6)}...${process.env.SKILLHUB_API_KEY.slice(-4)}`)
  }
  if (discovery) {
    log(`${c('dim', 'Skills:')}   ${c('cyan', `${API_BASE}/marketplace`)}`)
    log(`${c('dim', 'OpenAPI:')} ${discovery.registry?.openapi}`)
  }
  log()
  log(`Install dir (project): ${c('gray', path.join(process.cwd(), '.skillhub', 'skills'))}`)
  log(`Install dir (global):  ${c('gray', path.join(os.homedir(), '.skillhub', 'skills'))}`)
}

function cmdHelp() {
  log()
  log(`  ${c('bold', c('cyan', 'SkillHub CLI'))} ${c('dim', `v${VERSION}`)}`)
  log(`  ${c('dim', 'AI Agent Skills Marketplace — OpenClaw compatible')}`)
  log()
  log(c('bold', '  Usage:'))
  log(`    ${c('cyan', 'npx skillhub@latest')} ${c('yellow', '<command>')} ${c('dim', '[options]')}`)
  log()
  log(c('bold', '  Commands:'))
  const cmds = [
    ['install <slug>', 'Download and install a skill'],
    ['uninstall <slug>', 'Remove an installed skill'],
    ['list', 'List installed skills'],
    ['search <query>', 'Search the marketplace'],
    ['inspect <slug>', 'View skill details without installing'],
    ['update [slug]', 'Update installed skill(s)'],
    ['validate [path]', 'Validate a SKILL.md locally'],
    ['publish [path]', 'Publish a skill (requires API key)'],
    ['whoami', 'Show authenticated user info'],
    ['info', 'Show CLI configuration'],
  ]
  for (const [cmd, desc] of cmds) {
    log(`    ${c('yellow', cmd.padEnd(22))} ${c('dim', desc)}`)
  }
  log()
  log(c('bold', '  Options:'))
  log(`    ${c('dim', '--global, -g')}           Install/list globally (~/.skillhub/)`)
  log(`    ${c('dim', '--key <api-key>')}         SkillHub API key`)
  log(`    ${c('dim', '--force')}                Force reinstall`)
  log(`    ${c('dim', '--draft')}                Save as draft (publish command)`)
  log(`    ${c('dim', '--compatible <fw>')}      Filter by framework (search command)`)
  log(`    ${c('dim', '--remote')}               Also run server-side validation`)
  log()
  log(c('bold', '  Agent integration:'))
  log(`    ${c('dim', 'Claude Code')}  Add to CLAUDE.md: ${c('cyan', '@.skillhub/skills/<slug>/SKILL.md')}`)
  log(`    ${c('dim', 'Cursor')}       Add to .cursorrules`)
  log(`    ${c('dim', 'OpenClaw')}     Skills use compatible SKILL.md format`)
  log()
  log(c('bold', '  Examples:'))
  log(`    ${c('cyan', 'npx skillhub@latest install code-reviewer')}`)
  log(`    ${c('cyan', 'npx skillhub@latest search "code review" --compatible claude-code')}`)
  log(`    ${c('cyan', 'npx skillhub@latest validate ./SKILL.md --remote')}`)
  log(`    ${c('cyan', 'SKILLHUB_API_KEY=sh_xxx npx skillhub@latest publish ./SKILL.md')}`)
  log()
  log(`  ${c('dim', 'Marketplace:')} ${c('cyan', API_BASE)}`)
  log(`  ${c('dim', 'API docs:')}    ${c('cyan', `${API_BASE}/api/v1/openapi.json`)}`)
  log(`  ${c('dim', 'Discovery:')}   ${c('cyan', `${API_BASE}/.well-known/skillhub.json`)}`)
  log()
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { positional, options } = parseArgs(process.argv)
  const [command, ...rest] = positional

  if (options.version || options.v) { log(`skillhub v${VERSION}`); return }

  switch (command) {
    case 'install': case 'i':       await cmdInstall(rest[0], options); break
    case 'uninstall': case 'remove': case 'rm': await cmdUninstall(rest[0], options); break
    case 'list': case 'ls':         await cmdList(options); break
    case 'search': case 's':        await cmdSearch(rest.join(' '), options); break
    case 'inspect': case 'show':    await cmdInspect(rest[0], options); break
    case 'update': case 'upgrade':  await cmdUpdate(rest[0], options); break
    case 'validate': case 'lint':   await cmdValidate(rest[0], options); break
    case 'publish': case 'pub':     await cmdPublish(rest[0], options); break
    case 'whoami':                  await cmdWhoami(options); break
    case 'info': case 'config':     await cmdInfo(); break
    case 'help': case '--help': case '-h': case undefined: cmdHelp(); break
    default:
      err(`Unknown command: ${command}`)
      log()
      cmdHelp()
      process.exit(1)
  }
}

main().catch((e) => { err('Unexpected error:', e.message); process.exit(1) })
