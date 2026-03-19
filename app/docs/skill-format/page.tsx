import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Skill Format Guide — SkillHub Docs',
  description: 'Learn how to write SKILL.md files for the SkillHub marketplace.',
}

const EXAMPLE_SKILL = `---
name: "Git Commit Assistant"
description: "Generates conventional commit messages by analyzing staged diffs."
version: "1.2.0"
category: "development"
tags:
  - git
  - commits
  - conventional-commits
compatible_with:
  - claude-code
  - cursor
  - windsurf
homepage: "https://github.com/youruser/git-commit-assistant"
user_invocable: true
price_cents: 0
---

You are an expert at writing conventional Git commit messages.

When the user asks you to commit their changes, follow these steps:

1. Run \`git diff --staged\` to see what has been staged.
2. Analyse the changes and determine the commit type:
   - feat: a new feature
   - fix: a bug fix
   - docs: documentation only changes
   - refactor: code change that neither fixes a bug nor adds a feature
   - test: adding or updating tests
   - chore: build process or tooling changes
3. Write a commit message in the format:
   \`<type>(<optional scope>): <short imperative description>\`
4. If the change is complex, add a blank line followed by a longer body.
5. Run \`git commit -m "<message>"\`.

Always keep the subject line under 72 characters. Use the imperative mood
("add feature" not "added feature").`

const REQUIRED_FIELDS = [
  { field: 'name', type: 'string', description: 'Human-readable name displayed on the marketplace (max 80 chars).' },
  { field: 'description', type: 'string', description: 'Short summary shown in search results and skill cards (max 300 chars).' },
  { field: 'version', type: 'string', description: 'Semantic version string, e.g. "1.0.0".' },
  { field: 'category', type: 'string', description: 'One of the supported category slugs (see list below).' },
  { field: 'tags', type: 'string[]', description: 'Array of lowercase tag strings. Used for search and filtering (max 10 tags).' },
  { field: 'compatible_with', type: 'string[]', description: 'Array of compatible framework slugs (see list below).' },
]

const OPTIONAL_FIELDS = [
  { field: 'homepage', type: 'string', description: 'URL to a related GitHub repo, website, or documentation page.' },
  { field: 'user_invocable', type: 'boolean', description: 'Whether users can trigger this skill manually. Defaults to true.' },
  { field: 'price_cents', type: 'number', description: 'Price in US cents. 0 = free. Must be ≥ 100 (i.e. $1.00) for paid skills.' },
]

const CATEGORIES = [
  { slug: 'productivity', label: 'Productivity' },
  { slug: 'development', label: 'Development' },
  { slug: 'data-analytics', label: 'Data & Analytics' },
  { slug: 'communication', label: 'Communication' },
  { slug: 'ai-ml', label: 'AI & ML' },
  { slug: 'automation', label: 'Automation' },
  { slug: 'research', label: 'Research' },
  { slug: 'writing', label: 'Writing' },
  { slug: 'security', label: 'Security' },
  { slug: 'finance', label: 'Finance' },
  { slug: 'devops', label: 'DevOps' },
  { slug: 'testing', label: 'Testing' },
]

const FRAMEWORKS = [
  { slug: 'claude-code', label: 'Claude Code', url: 'https://docs.anthropic.com/claude/docs/claude-code' },
  { slug: 'cursor', label: 'Cursor', url: 'https://cursor.sh' },
  { slug: 'windsurf', label: 'Windsurf', url: 'https://codeium.com/windsurf' },
  { slug: 'openclaw', label: 'OpenClaw', url: 'https://openclaw.dev' },
  { slug: 'aider', label: 'Aider', url: 'https://aider.chat' },
  { slug: 'continue', label: 'Continue.dev', url: 'https://continue.dev' },
  { slug: 'generic', label: 'Generic (any agent)', url: null },
]

export default function SkillFormatPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">Skill Format Guide</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Skills on SkillHub are distributed as <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">SKILL.md</code> files —
          a YAML frontmatter block followed by a Markdown body containing the actual skill prompt
          or instructions that the AI agent will follow.
        </p>
      </div>

      <div className="space-y-12 text-sm leading-relaxed">
        {/* File Structure */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">File Structure</h2>
          <p className="text-muted-foreground mb-4">
            A SKILL.md file has two parts separated by YAML front-matter delimiters (<code className="bg-muted px-1 rounded font-mono">---</code>):
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
{`---
# YAML frontmatter — skill metadata
name: "Your Skill Name"
description: "What this skill does."
version: "1.0.0"
category: "development"
tags:
  - example
compatible_with:
  - claude-code
---

# Markdown body — the actual skill prompt

Your instructions to the AI agent go here.`}
          </pre>
        </section>

        {/* Required Fields */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Required Frontmatter Fields</h2>
          <div className="space-y-3">
            {REQUIRED_FIELDS.map((f) => (
              <Card key={f.field}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="font-mono text-primary text-sm">{f.field}</code>
                    <Badge variant="outline" className="text-xs font-mono">
                      {f.type}
                    </Badge>
                    <Badge variant="destructive" className="text-xs">required</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Optional Fields */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Optional Frontmatter Fields</h2>
          <div className="space-y-3">
            {OPTIONAL_FIELDS.map((f) => (
              <Card key={f.field}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="font-mono text-primary text-sm">{f.field}</code>
                    <Badge variant="outline" className="text-xs font-mono">
                      {f.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">optional</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Categories</h2>
          <p className="text-muted-foreground mb-4">
            The <code className="bg-muted px-1 rounded font-mono">category</code> field must be one of
            the following slugs exactly:
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <div key={c.slug} className="flex items-center gap-1.5 bg-muted rounded-md px-3 py-1.5">
                <code className="font-mono text-xs text-primary">{c.slug}</code>
                <span className="text-muted-foreground text-xs">— {c.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Compatible Frameworks */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Compatible Frameworks</h2>
          <p className="text-muted-foreground mb-4">
            The <code className="bg-muted px-1 rounded font-mono">compatible_with</code> array tells
            users which AI coding tools your skill supports. Use one or more of the following slugs:
          </p>
          <div className="space-y-2">
            {FRAMEWORKS.map((f) => (
              <div key={f.slug} className="flex items-center gap-3">
                <code className="font-mono text-xs text-primary w-24 shrink-0">{f.slug}</code>
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground text-xs hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    {f.label}
                  </a>
                ) : (
                  <span className="text-muted-foreground text-xs">{f.label}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-4">
            Use <code className="bg-muted px-1 rounded font-mono">generic</code> if your skill is
            plain markdown instructions that work with any agent.
          </p>
        </section>

        {/* Full Example */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Full Example SKILL.md</h2>
          <p className="text-muted-foreground mb-4">
            Here is a complete, valid SKILL.md file demonstrating all fields:
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono whitespace-pre-wrap">
            {EXAMPLE_SKILL}
          </pre>
        </section>

        {/* Skill Body */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Writing the Skill Body</h2>
          <p className="text-muted-foreground mb-3">
            The Markdown body after the frontmatter is the prompt or instruction set that gets
            injected into the AI agent&apos;s context. A few guidelines:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
            <li>Write in second person, addressing the AI (&quot;You are…&quot;, &quot;When the user asks…&quot;).</li>
            <li>Use numbered steps for multi-step workflows — agents handle structured instructions well.</li>
            <li>Include example inputs and expected outputs to clarify intent.</li>
            <li>Keep the prompt focused on a single, well-defined task. Split broad skills into smaller composable ones.</li>
            <li>Avoid hardcoding API keys, secrets, or credentials in the body.</li>
            <li>Use code blocks with language hints when showing code examples.</li>
          </ul>
        </section>

        {/* Directory Layout */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Recommended Directory Layout</h2>
          <p className="text-muted-foreground mb-4">
            When creating a skill locally before publishing, we recommend this layout:
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
{`my-skill/
├── SKILL.md          # required — the skill file
└── README.md         # optional — shown on the marketplace detail page`}
          </pre>
          <p className="text-muted-foreground mt-3">
            The <code className="bg-muted px-1 rounded font-mono">README.md</code> is displayed on
            your skill&apos;s detail page on the marketplace. Use it to document usage examples,
            configuration options, and known limitations.
          </p>
        </section>

        {/* Best Practices */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Best Practices</h2>
          <div className="space-y-3 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Keep skills focused</p>
              <p>
                A skill that does one thing exceptionally well is more useful than one that tries
                to handle every edge case. Users can compose multiple skills for complex workflows.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Test before publishing</p>
              <p>
                Install your SKILL.md locally with <code className="bg-muted px-1 rounded font-mono">npx skillhub@latest install ./SKILL.md</code> and
                test it in your target AI tool before publishing to the marketplace.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Include examples in your README</p>
              <p>
                Show users exactly what to say or type to invoke the skill, and what output they
                can expect. Screenshots or recordings go a long way.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Version your skills</p>
              <p>
                Increment the <code className="bg-muted px-1 rounded font-mono">version</code> field
                on every meaningful update. Users who installed an earlier version will see that an
                update is available.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">No secrets in SKILL.md</p>
              <p>
                Skill files are distributed to all users who install them. Never put API keys,
                passwords, or sensitive data inside SKILL.md. All uploaded files are also
                scanned by VirusTotal.
              </p>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section className="border-t border-border pt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">Next Steps</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs/cli"
              className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              CLI Reference →
            </Link>
            <Link
              href="/skills/new"
              className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Publish a Skill →
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Browse Marketplace →
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
