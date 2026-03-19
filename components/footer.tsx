import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">SkillHub</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The marketplace for AI agent skills. Browse, buy, and sell custom
              tools that supercharge your AI workflows.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Install any skill in seconds:
            </p>
            <code className="mt-1 block text-xs bg-muted rounded px-3 py-2 font-mono text-primary">
              npx skillhub@latest install &lt;slug&gt;
            </code>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/marketplace" className="hover:text-foreground transition-colors">
                  Browse Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?sort=popular" className="hover:text-foreground transition-colors">
                  Popular Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?price=free" className="hover:text-foreground transition-colors">
                  Free Skills
                </Link>
              </li>
              <li>
                <Link href="/marketplace?sort=newest" className="hover:text-foreground transition-colors">
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4">Creators</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard/upload" className="hover:text-foreground transition-colors">
                  Publish a Skill
                </Link>
              </li>
              <li>
                <Link href="/dashboard/earnings" className="hover:text-foreground transition-colors">
                  Earnings Dashboard
                </Link>
              </li>
              <li>
                <Link href="/docs/skill-format" className="hover:text-foreground transition-colors">
                  Skill Format Guide
                </Link>
              </li>
              <li>
                <Link href="/docs/cli" className="hover:text-foreground transition-colors">
                  CLI Reference
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} SkillHub. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
