import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'CLI Reference — SkillHub Docs',
  description: 'Reference documentation for the SkillHub CLI.',
}

interface CommandProps {
  syntax: string
  flags?: { flag: string; description: string }[]
  description: string
  example?: string
  notes?: string
}

function Command({ syntax, flags, description, example, notes }: CommandProps) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-5">
        <pre className="text-sm font-mono text-primary">{syntax}</pre>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {flags && flags.length > 0 && (
          <div className="space-y-1.5">
            {flags.map((f) => (
              <div key={f.flag} className="flex gap-3 text-xs">
                <code className="font-mono text-primary shrink-0">{f.flag}</code>
                <span className="text-muted-foreground">{f.description}</span>
              </div>
            ))}
          </div>
        )}
        {example && (
          <pre className="bg-muted rounded-md p-3 text-xs overflow-auto font-mono">
            {example}
          </pre>
        )}
        {notes && <p className="text-xs text-muted-foreground/70 italic">{notes}</p>}
      </CardContent>
    </Card>
  )
}

export default function CliPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-3">CLI Reference</h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          The SkillHub CLI lets you install, manage, search, and publish skills directly from your
          terminal. No global installation required — run it with{' '}
          <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">npx</code>.
        </p>
      </div>

      <div className="space-y-12 text-sm">

        {/* Installation */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Installation</h2>
          <p className="text-muted-foreground mb-4">
            The CLI is distributed as an npm package and requires no global installation. Use{' '}
            <code className="bg-muted px-1 rounded font-mono">npx</code> to always run the latest
            version:
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
            npx skillhub@latest &lt;command&gt;
          </pre>
          <p className="text-muted-foreground mt-3">
            If you prefer to install globally:
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono mt-2">
{`npm install -g skillhub
skillhub <command>`}
          </pre>
          <p className="text-muted-foreground mt-3">
            Requires Node.js 18 or later.
          </p>
        </section>

        {/* Where skills are stored */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Where Skills Are Stored</h2>
          <p className="text-muted-foreground mb-3">
            Installed skills are written to your project or home directory under:
          </p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
            .skillhub/skills/&lt;slug&gt;/SKILL.md
          </pre>
          <p className="text-muted-foreground mt-3">
            The CLI looks for <code className="bg-muted px-1 rounded font-mono">.skillhub/</code> in
            the current working directory first, then walks up to the git root before falling back
            to <code className="bg-muted px-1 rounded font-mono">~/.skillhub/</code>.
          </p>
        </section>

        {/* Commands */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Commands</h2>
          <div className="space-y-4">

            <Command
              syntax="npx skillhub@latest install <slug>"
              description="Downloads and installs a skill from the SkillHub marketplace into .skillhub/skills/<slug>/SKILL.md. For free skills, no authentication is required."
              flags={[
                { flag: '--key sh_xxx', description: 'API key for paid skills. Alternative to setting the SKILLHUB_API_KEY environment variable.' },
                { flag: '--dir <path>', description: 'Override the target directory for the installed skill.' },
                { flag: '--force', description: 'Overwrite an existing installation of the same skill.' },
              ]}
              example={`# Install a free skill
npx skillhub@latest install git-commit-assistant

# Install a paid skill with an API key
npx skillhub@latest install advanced-debugger --key sh_abc123`}
            />

            <Command
              syntax="npx skillhub@latest list"
              description="Lists all skills currently installed in the .skillhub/skills/ directory, including their version and local path."
              example={`npx skillhub@latest list

# Output:
# git-commit-assistant   v1.2.0   .skillhub/skills/git-commit-assistant/SKILL.md
# code-reviewer          v0.9.1   .skillhub/skills/code-reviewer/SKILL.md`}
            />

            <Command
              syntax="npx skillhub@latest remove <slug>"
              description="Removes an installed skill by deleting its directory under .skillhub/skills/."
              example="npx skillhub@latest remove git-commit-assistant"
            />

            <Command
              syntax="npx skillhub@latest search <query>"
              description="Searches the SkillHub marketplace and prints matching skills with their name, slug, category, price, and download count."
              flags={[
                { flag: '--category <slug>', description: 'Filter results by category (e.g. development, security).' },
                { flag: '--free', description: 'Only show free skills.' },
                { flag: '--limit <n>', description: 'Maximum number of results to display (default: 10).' },
              ]}
              example={`npx skillhub@latest search "commit message"
npx skillhub@latest search typescript --category development --free`}
            />

            <Command
              syntax="npx skillhub@latest info <slug>"
              description="Displays detailed information about a skill from the marketplace, including its description, version, category, tags, compatible frameworks, price, and download count."
              example={`npx skillhub@latest info git-commit-assistant

# Output:
# Name:        Git Commit Assistant
# Version:     1.2.0
# Author:      youruser
# Category:    development
# Price:       Free
# Downloads:   4.2k
# Tags:        git, commits, conventional-commits
# Compatible:  claude-code, cursor
# Description: Generates conventional commit messages by analysing staged diffs.`}
            />

            <Command
              syntax="npx skillhub@latest publish"
              description="Publishes the SKILL.md file in the current directory to SkillHub. Opens your browser to the publish flow where you can review and confirm the submission. The SKILL.md must be valid and pass schema validation before it is accepted."
              flags={[
                { flag: '--no-browser', description: "Don't open the browser automatically. Prints the publish URL instead." },
              ]}
              example={`cd my-skill/
npx skillhub@latest publish`}
              notes="The publish command validates your SKILL.md locally before opening the browser. Fix any validation errors reported in the terminal first."
            />

          </div>
        </section>

        {/* Environment Variables */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Environment Variables</h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-primary text-sm">SKILLHUB_API_KEY</code>
                  <Badge variant="outline" className="text-xs">optional</Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  Your SkillHub API key (<code className="font-mono">sh_xxx</code>). Required to install
                  paid skills without passing <code className="font-mono">--key</code> on every command.
                  Set this in your shell profile or in a <code className="font-mono">.env</code> file.
                </p>
                <pre className="bg-muted rounded p-2 text-xs font-mono">
                  export SKILLHUB_API_KEY=sh_yourKeyHere
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-primary text-sm">SKILLHUB_REGISTRY</code>
                  <Badge variant="outline" className="text-xs">advanced</Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  Override the SkillHub registry URL. Defaults to{' '}
                  <code className="font-mono">https://skillhub.dev</code>. Useful for self-hosted or
                  staging environments.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Getting API Keys */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Getting an API Key</h2>
          <p className="text-muted-foreground mb-4">
            API keys are required to install paid skills via the CLI. To generate one:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-2">
            <li>Sign in to your SkillHub account.</li>
            <li>
              Navigate to{' '}
              <Link href="/dashboard/api-keys" className="text-primary underline underline-offset-2">
                Dashboard → API Keys
              </Link>
              .
            </li>
            <li>Click &quot;Create new key&quot; and give it a name (e.g. &quot;My Laptop&quot;).</li>
            <li>Copy the key — it is only shown once.</li>
            <li>
              Set it as the <code className="bg-muted px-1 rounded font-mono">SKILLHUB_API_KEY</code> environment
              variable, or pass it with <code className="bg-muted px-1 rounded font-mono">--key</code>.
            </li>
          </ol>
          <div className="mt-4">
            <Link
              href="/dashboard/api-keys"
              className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Go to API Keys →
            </Link>
          </div>
        </section>

        {/* Examples */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Common Workflows</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-2">Find and install a skill</h3>
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
{`# Search for a skill
npx skillhub@latest search "sql query"

# View details
npx skillhub@latest info sql-query-builder

# Install it
npx skillhub@latest install sql-query-builder`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">Publish your first skill</h3>
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
{`# Create a new skill directory
mkdir my-skill && cd my-skill

# Create your SKILL.md (see the Skill Format Guide)
touch SKILL.md

# Validate and publish
npx skillhub@latest publish`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-foreground mb-2">Install a paid skill in CI</h3>
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-auto font-mono">
{`# In your CI environment, set the secret:
# SKILLHUB_API_KEY=sh_xxx

npx skillhub@latest install advanced-code-reviewer`}
              </pre>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-4">Troubleshooting</h2>
          <div className="space-y-3 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">
                <code className="font-mono text-sm">Error: Skill not found</code>
              </p>
              <p>
                Double-check the slug is correct. Use{' '}
                <code className="bg-muted px-1 rounded font-mono">search</code> to find the exact slug,
                or browse the marketplace in your browser.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                <code className="font-mono text-sm">Error: Payment required</code>
              </p>
              <p>
                The skill is paid. Provide your API key via{' '}
                <code className="bg-muted px-1 rounded font-mono">--key</code> or the{' '}
                <code className="bg-muted px-1 rounded font-mono">SKILLHUB_API_KEY</code> environment
                variable. Ensure the key has purchased this skill.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                <code className="font-mono text-sm">Validation error: missing required field</code>
              </p>
              <p>
                Your SKILL.md frontmatter is missing a required field. See the{' '}
                <Link href="/docs/skill-format" className="text-primary underline underline-offset-2">
                  Skill Format Guide
                </Link>{' '}
                for the full list of required fields.
              </p>
            </div>
          </div>
        </section>

        {/* Footer links */}
        <section className="border-t border-border pt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">See Also</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/docs/skill-format"
              className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Skill Format Guide →
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Manage API Keys →
            </Link>
            <Link
              href="/marketplace"
              className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              Browse Marketplace →
            </Link>
          </div>
        </section>

      </div>
    </div>
  )
}
