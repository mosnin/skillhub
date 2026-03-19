#!/usr/bin/env node

/**
 * SkillHub CLI
 * Usage: npx skillhub@latest <command> [args]
 *
 * Commands:
 *   install <slug>       Install a skill
 *   uninstall <slug>     Remove a skill
 *   list                 List installed skills
 *   search <query>       Search the marketplace
 *   inspect <slug>       Preview a skill without installing
 *   publish <path>       Publish a skill (requires API key)
 *   update [slug]        Update a skill or all skills
 *   info                 Show CLI config info
 */

const fs = require('fs')
const path = require('path')
const os = require('os')
const https = require('https')
const http = require('http')

const API_BASE = process.env.SKILLHUB_API_URL || 'https://skillhub.dev'
const VERSION = '0.1.0'

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`
}

function log(...args) {
  console.log(...args)
}

function err(...args) {
  console.error(c('red', '✗'), ...args)
}

function ok(...args) {
  console.log(c('green', '✓'), ...args)
}

function info(...args) {
  console.log(c('cyan', 'ℹ'), ...args)
}

function warn(...args) {
  console.log(c('yellow', '⚠'), ...args)
}

// Simple HTTP fetch (no dependencies)
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const lib = urlObj.protocol === 'https:' ? https : http
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `skillhub-cli/${VERSION}`,
        ...options.headers,
      },
    }

    const req = lib.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => JSON.parse(data),
          text: () => data,
        })
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

// Get the index file path for installed skills
function getIndexPath(global = false) {
  const base = global ? path.join(os.homedir(), '.skillhub') : path.join(process.cwd(), '.skillhub')
  return path.join(base, 'index.json')
}

// Get the skills directory
function getSkillsDir(global = false) {
  const base = global ? path.join(os.homedir(), '.skillhub') : path.join(process.cwd(), '.skillhub')
  return path.join(base, 'skills')
}

// Read the local index
function readIndex(global = false) {
  const indexPath = getIndexPath(global)
  if (!fs.existsSync(indexPath)) return {}
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  } catch {
    return {}
  }
}

// Write the local index
function writeIndex(index, global = false) {
  const indexPath = getIndexPath(global)
  fs.mkdirSync(path.dirname(indexPath), { recursive: true })
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
}

// Get API key from env or config
function getApiKey(options = {}) {
  return options.key || process.env.SKILLHUB_API_KEY
}

// Parse CLI args
function parseArgs(argv) {
  const args = argv.slice(2)
  const options = {}
  const positional = []

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('--')) {
        options[key] = nextArg
        i++
      } else {
        options[key] = true
      }
    } else if (args[i].startsWith('-') && args[i].length === 2) {
      const key = args[i].slice(1)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('-')) {
        options[key] = nextArg
        i++
      } else {
        options[key] = true
      }
    } else {
      positional.push(args[i])
    }
  }

  return { positional, options }
}

// ─── COMMANDS ────────────────────────────────────────────────────────────────

async function cmdInstall(slug, options = {}) {
  if (!slug) {
    err('Please provide a skill slug: skillhub install <slug>')
    process.exit(1)
  }

  const global = options.global || options.g || false
  const apiKey = getApiKey(options)

  log(`${c('cyan', '⬇')} Installing ${c('bold', slug)}...`)

  // Fetch skill metadata
  let skillMeta
  try {
    const res = await fetch(`${API_BASE}/api/skills/${slug}`)
    if (res.status === 404) {
      err(`Skill "${slug}" not found in the marketplace`)
      info(`Search for skills: ${c('cyan', `npx skillhub@latest search ${slug}`)}`)
      process.exit(1)
    }
    if (!res.ok) {
      err(`Failed to fetch skill info (${res.status})`)
      process.exit(1)
    }
    skillMeta = res.json()
  } catch (e) {
    err(`Cannot connect to SkillHub (${API_BASE})`)
    err(e.message)
    process.exit(1)
  }

  // Check if paid and needs API key
  if (skillMeta.priceCents > 0 && !apiKey) {
    err(`This skill costs $${(skillMeta.priceCents / 100).toFixed(2)} and requires a purchase.`)
    log()
    log(`  ${c('yellow', '1.')} Purchase it at: ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
    log(`  ${c('yellow', '2.')} Get an API key at: ${c('cyan', `${API_BASE}/dashboard/api-keys`)}`)
    log(`  ${c('yellow', '3.')} Install with: ${c('cyan', `SKILLHUB_API_KEY=sh_xxx npx skillhub@latest install ${slug}`)}`)
    process.exit(1)
  }

  // Fetch content
  let content, name, version
  try {
    const headers = {}
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

    const res = await fetch(`${API_BASE}/api/skills/${slug}/content`, { headers })

    if (res.status === 401) {
      err('Invalid or expired API key')
      process.exit(1)
    }
    if (res.status === 402) {
      const data = res.json()
      err(`Payment required. Purchase at: ${data.purchaseUrl || `${API_BASE}/skills/${slug}`}`)
      process.exit(1)
    }
    if (!res.ok) {
      err(`Failed to download skill content (${res.status})`)
      process.exit(1)
    }

    const data = res.json()
    content = data.content
    name = data.name
    version = data.version
  } catch (e) {
    err('Failed to download skill')
    err(e.message)
    process.exit(1)
  }

  // Write skill file
  const skillsDir = getSkillsDir(global)
  const skillDir = path.join(skillsDir, slug)
  const skillFile = path.join(skillDir, 'SKILL.md')

  fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillFile, content)

  // Update index
  const index = readIndex(global)
  index[slug] = {
    name,
    version,
    slug,
    installedAt: new Date().toISOString(),
    path: skillFile,
    paid: skillMeta.priceCents > 0,
  }
  writeIndex(index, global)

  log()
  ok(`Installed ${c('bold', name)} ${c('gray', `v${version}`)}`)
  log(`  ${c('dim', '→')} ${skillFile}`)
  log()

  if (global) {
    log(`${c('dim', 'Skill installed globally. Your AI agent can now use:')}`)
    log(`  ${c('gray', '~/.skillhub/skills/' + slug + '/SKILL.md')}`)
  } else {
    log(`${c('dim', 'Skill installed. Include in your AI agent with:')}`)
    log(`  ${c('gray', '.skillhub/skills/' + slug + '/SKILL.md')}`)
    log()
    log(`${c('dim', 'For Claude Code, add to your project CLAUDE.md:')}`)
    log(`  ${c('cyan', `@.skillhub/skills/${slug}/SKILL.md`)}`)
  }
}

async function cmdUninstall(slug, options = {}) {
  if (!slug) {
    err('Please provide a skill slug: skillhub uninstall <slug>')
    process.exit(1)
  }

  const global = options.global || options.g || false
  const skillsDir = getSkillsDir(global)
  const skillDir = path.join(skillsDir, slug)

  if (!fs.existsSync(skillDir)) {
    warn(`Skill "${slug}" is not installed ${global ? 'globally' : 'in this project'}`)
    process.exit(0)
  }

  fs.rmSync(skillDir, { recursive: true, force: true })

  // Update index
  const index = readIndex(global)
  delete index[slug]
  writeIndex(index, global)

  ok(`Uninstalled ${c('bold', slug)}`)
}

async function cmdList(options = {}) {
  const global = options.global || options.g || false
  const localIndex = readIndex(false)
  const globalIndex = global ? readIndex(true) : {}

  const allEntries = [
    ...Object.values(localIndex).map((s) => ({ ...s, scope: 'project' })),
    ...Object.values(globalIndex).map((s) => ({ ...s, scope: 'global' })),
  ]

  if (allEntries.length === 0) {
    log(c('dim', 'No skills installed.'))
    log()
    log(`Browse skills: ${c('cyan', `${API_BASE}/marketplace`)}`)
    log(`Install a skill: ${c('cyan', 'npx skillhub@latest install <slug>')}`)
    return
  }

  log()
  log(c('bold', 'Installed Skills'))
  log()

  for (const skill of allEntries) {
    const scopeBadge = skill.scope === 'global' ? c('blue', '[global]') : c('gray', '[project]')
    log(`  ${c('green', '●')} ${c('bold', skill.name || skill.slug)} ${c('dim', `v${skill.version}`)} ${scopeBadge}`)
    log(`     ${c('dim', skill.path)}`)
  }
  log()
  log(`${allEntries.length} skill${allEntries.length !== 1 ? 's' : ''} installed`)
}

async function cmdSearch(query, options = {}) {
  if (!query) {
    err('Please provide a search query: skillhub search <query>')
    process.exit(1)
  }

  log(c('dim', `Searching for "${query}"...`))
  log()

  let results
  try {
    const res = await fetch(
      `${API_BASE}/api/skills?q=${encodeURIComponent(query)}&limit=10`
    )
    results = res.json()
  } catch (e) {
    err('Failed to search SkillHub')
    process.exit(1)
  }

  if (!Array.isArray(results) || results.length === 0) {
    log(c('dim', `No skills found for "${query}"`))
    log()
    log(`Browse all skills: ${c('cyan', `${API_BASE}/marketplace`)}`)
    return
  }

  log(c('bold', `Found ${results.length} skill${results.length !== 1 ? 's' : ''}`))
  log()

  for (const skill of results) {
    const price = skill.priceCents === 0 ? c('green', 'Free') : c('yellow', `$${(skill.priceCents / 100).toFixed(2)}`)
    log(`  ${c('cyan', skill.slug)} ${c('dim', `v${skill.version}`)} ${price}`)
    log(`  ${c('bold', skill.name)}`)
    log(`  ${c('dim', skill.description)}`)
    log(`  ${c('gray', `by ${skill.authorUsername}`)} · ${c('dim', `${skill.downloads} downloads`)}`)
    log()
  }

  log(`Install: ${c('cyan', `npx skillhub@latest install <slug>`)}`)
}

async function cmdInspect(slug, options = {}) {
  if (!slug) {
    err('Please provide a skill slug: skillhub inspect <slug>')
    process.exit(1)
  }

  let skill
  try {
    const res = await fetch(`${API_BASE}/api/skills/${slug}`)
    if (!res.ok) {
      err(`Skill "${slug}" not found`)
      process.exit(1)
    }
    skill = res.json()
  } catch (e) {
    err('Failed to fetch skill info')
    process.exit(1)
  }

  log()
  log(c('bold', skill.name) + ' ' + c('dim', `v${skill.version}`))
  log(c('dim', '─'.repeat(50)))
  log()
  log(skill.description)
  log()
  log(`${c('dim', 'Author:')}    ${skill.author?.username || 'unknown'}`)
  log(`${c('dim', 'Category:')}  ${skill.category}`)
  log(`${c('dim', 'Tags:')}      ${(skill.tags || []).join(', ') || 'none'}`)
  log(`${c('dim', 'Downloads:')} ${skill.downloads}`)
  log(`${c('dim', 'Price:')}     ${skill.priceCents === 0 ? c('green', 'Free') : c('yellow', `$${(skill.priceCents / 100).toFixed(2)}`)}`)
  log()
  log(`View details: ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
  log(`Install:      ${c('cyan', `npx skillhub@latest install ${slug}`)}`)
}

async function cmdUpdate(slug, options = {}) {
  const global = options.global || options.g || false
  const index = readIndex(global)

  const toUpdate = slug ? [slug] : Object.keys(index)

  if (toUpdate.length === 0) {
    log(c('dim', 'No skills installed.'))
    return
  }

  log(`Updating ${toUpdate.length} skill${toUpdate.length !== 1 ? 's' : ''}...`)
  log()

  for (const s of toUpdate) {
    if (!index[s]) {
      warn(`Skill "${s}" is not installed`)
      continue
    }
    await cmdInstall(s, { ...options, global })
  }
}

async function cmdPublish(skillPath, options = {}) {
  const apiKey = getApiKey(options)
  if (!apiKey) {
    err('An API key is required to publish skills')
    log()
    log(`  Get your API key at: ${c('cyan', `${API_BASE}/dashboard/api-keys`)}`)
    log(`  Then run: ${c('cyan', `SKILLHUB_API_KEY=sh_xxx npx skillhub@latest publish ./SKILL.md`)}`)
    process.exit(1)
  }

  const filePath = path.resolve(skillPath || './SKILL.md')
  if (!fs.existsSync(filePath)) {
    err(`File not found: ${filePath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(filePath, 'utf8')
  log(c('dim', `Publishing ${filePath}...`))

  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) {
    err('SKILL.md must have YAML frontmatter with name, slug, description, category')
    process.exit(1)
  }

  const frontmatter = {}
  frontmatterMatch[1].split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':')
    if (key && rest.length > 0) {
      let value = rest.join(':').trim()
      // Parse arrays like [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map((s) => s.trim())
      }
      frontmatter[key.trim()] = value
    }
  })

  const { name, slug, description, category, version = '1.0.0', tags = [] } = frontmatter

  if (!name || !slug || !description || !category) {
    err('SKILL.md frontmatter must include: name, slug, description, category')
    process.exit(1)
  }

  try {
    const res = await fetch(`${API_BASE}/api/skills`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        name,
        slug,
        description,
        category,
        tags: Array.isArray(tags) ? tags : [tags],
        version,
        content,
        isPublished: true,
      }),
    })

    const data = res.json()
    if (res.ok) {
      log()
      ok(`Published ${c('bold', name)}!`)
      log(`  ${c('dim', '→')} ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
      log()
      log(`Install command: ${c('cyan', `npx skillhub@latest install ${slug}`)}`)
    } else if (res.status === 409) {
      // Skill exists — update it
      const updateRes = await fetch(`${API_BASE}/api/skills/${slug}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ content, version }),
      })
      if (updateRes.ok) {
        ok(`Updated ${c('bold', name)} to v${version}`)
        log(`  ${c('dim', '→')} ${c('cyan', `${API_BASE}/skills/${slug}`)}`)
      } else {
        err('Failed to update skill:', updateRes.json().error)
        process.exit(1)
      }
    } else {
      err('Failed to publish:', data.error || 'Unknown error')
      process.exit(1)
    }
  } catch (e) {
    err('Failed to publish skill')
    err(e.message)
    process.exit(1)
  }
}

function cmdHelp() {
  log()
  log(`  ${c('bold', c('cyan', 'SkillHub CLI'))} ${c('dim', `v${VERSION}`)}`)
  log(`  ${c('dim', 'The AI Agent Skills Marketplace')}`)
  log()
  log(c('bold', '  Usage:'))
  log(`    ${c('cyan', 'npx skillhub@latest')} ${c('yellow', '<command>')} ${c('dim', '[options]')}`)
  log()
  log(c('bold', '  Commands:'))
  log(`    ${c('yellow', 'install')} <slug>      Install a skill`)
  log(`    ${c('yellow', 'uninstall')} <slug>    Remove a skill`)
  log(`    ${c('yellow', 'list')}                List installed skills`)
  log(`    ${c('yellow', 'search')} <query>      Search the marketplace`)
  log(`    ${c('yellow', 'inspect')} <slug>      Preview a skill without installing`)
  log(`    ${c('yellow', 'update')} [slug]       Update installed skill(s)`)
  log(`    ${c('yellow', 'publish')} <path>      Publish a skill (requires API key)`)
  log()
  log(c('bold', '  Options:'))
  log(`    ${c('dim', '--global, -g')}          Install/list globally (~/.skillhub/)`)
  log(`    ${c('dim', '--key <api-key>')}        SkillHub API key (or SKILLHUB_API_KEY env)`)
  log(`    ${c('dim', '--api <url>')}            Custom API URL`)
  log()
  log(c('bold', '  Examples:'))
  log(`    ${c('cyan', 'npx skillhub@latest install code-reviewer')}`)
  log(`    ${c('cyan', 'npx skillhub@latest search "code review"')}`)
  log(`    ${c('cyan', 'SKILLHUB_API_KEY=sh_xxx npx skillhub@latest install premium-skill')}`)
  log(`    ${c('cyan', 'npx skillhub@latest publish ./SKILL.md')}`)
  log()
  log(`  ${c('dim', 'Marketplace:')} ${c('cyan', 'https://skillhub.dev')}`)
  log()
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const { positional, options } = parseArgs(process.argv)
  const [command, ...rest] = positional

  if (options.version || options.v) {
    log(`skillhub v${VERSION}`)
    process.exit(0)
  }

  switch (command) {
    case 'install':
    case 'i':
      await cmdInstall(rest[0], options)
      break

    case 'uninstall':
    case 'remove':
    case 'rm':
      await cmdUninstall(rest[0], options)
      break

    case 'list':
    case 'ls':
      await cmdList(options)
      break

    case 'search':
    case 's':
      await cmdSearch(rest.join(' '), options)
      break

    case 'inspect':
      await cmdInspect(rest[0], options)
      break

    case 'update':
    case 'upgrade':
      await cmdUpdate(rest[0], options)
      break

    case 'publish':
    case 'pub':
      await cmdPublish(rest[0], options)
      break

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      cmdHelp()
      break

    default:
      err(`Unknown command: ${command}`)
      log()
      cmdHelp()
      process.exit(1)
  }
}

main().catch((e) => {
  err('Unexpected error:', e.message)
  process.exit(1)
})
