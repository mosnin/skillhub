import Link from 'next/link'
import { ArrowRight, Download, Zap, Shield, DollarSign, Package, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkillCard } from '@/components/skill-card'
import { db } from '@/lib/db'
import { skills, users, reviews } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { CATEGORY_LABELS, CATEGORY_ICONS, SKILL_CATEGORIES, formatNumber, type SkillCategory } from '@/lib/utils'

async function getFeaturedSkills() {
  const result = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      category: skills.category,
      tags: skills.tags,
      priceCents: skills.priceCents,
      downloads: skills.downloads,
      version: skills.version,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(eq(skills.isPublished, true))
    .orderBy(desc(skills.downloads))
    .limit(6)
  return result
}

async function getStats() {
  const [skillCount, userCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(skills)
      .where(eq(skills.isPublished, true)),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ])
  const totalDownloads = await db
    .select({ total: sql<number>`sum(downloads)` })
    .from(skills)
    .where(eq(skills.isPublished, true))

  return {
    skills: Number(skillCount[0]?.count || 0),
    creators: Number(userCount[0]?.count || 0),
    downloads: Number(totalDownloads[0]?.total || 0),
  }
}

export default async function HomePage() {
  const [featuredSkills, stats] = await Promise.all([
    getFeaturedSkills(),
    getStats(),
  ])

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative container mx-auto max-w-7xl px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Zap className="mr-1.5 h-3 w-3" />
              The npm for AI Agents
            </div>
            <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl mb-6">
              The Marketplace for{' '}
              <span className="text-primary">AI Agent</span> Skills
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              Discover, install, and monetize AI agent skills. One command to
              supercharge any AI agent — Claude, Cursor, Windsurf, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link href="/marketplace">
                <Button size="lg" className="gap-2">
                  Browse Skills
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/upload">
                <Button size="lg" variant="outline" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Sell Your Skills
                </Button>
              </Link>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/50 inline-block px-4 py-2">
              <code className="text-sm font-mono text-muted-foreground">
                <span className="text-primary">$</span> npx skillhub@latest install code-reviewer
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border/40 bg-card/30">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-foreground">{formatNumber(stats.skills)}</div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Package className="h-3.5 w-3.5" /> Skills
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{formatNumber(stats.creators)}</div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Users className="h-3.5 w-3.5" /> Creators
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{formatNumber(stats.downloads)}</div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Download className="h-3.5 w-3.5" /> Downloads
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Skills */}
      {featuredSkills.length > 0 && (
        <section className="container mx-auto max-w-7xl px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Popular Skills</h2>
              <p className="text-muted-foreground mt-1">Most downloaded by the community</p>
            </div>
            <Link href="/marketplace?sort=popular">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                id={skill.id}
                slug={skill.slug}
                name={skill.name}
                description={skill.description}
                category={skill.category}
                tags={skill.tags ?? []}
                priceCents={skill.priceCents}
                downloads={skill.downloads}
                version={skill.version}
                author={{
                  username: skill.authorUsername || 'unknown',
                  avatarUrl: skill.authorAvatarUrl,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-t border-border/40 bg-card/20">
        <div className="container mx-auto max-w-7xl px-4 py-16">
          <h2 className="text-2xl font-bold mb-2">Browse by Category</h2>
          <p className="text-muted-foreground mb-8">Find the perfect skill for your workflow</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {SKILL_CATEGORIES.map((cat) => (
              <Link key={cat} href={`/marketplace?category=${cat}`}>
                <div className="group flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-accent cursor-pointer">
                  <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {CATEGORY_LABELS[cat]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">How It Works</h2>
        <p className="text-muted-foreground text-center mb-12">Get started in seconds</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              icon: <Package className="h-6 w-6 text-primary" />,
              title: 'Browse & Discover',
              desc: 'Search thousands of AI agent skills across every category. Free and premium options available.',
            },
            {
              step: '02',
              icon: <Download className="h-6 w-6 text-primary" />,
              title: 'Install Instantly',
              desc: 'One command installs any skill into your project. Works with Claude Code, Cursor, Windsurf, and more.',
            },
            {
              step: '03',
              icon: <Zap className="h-6 w-6 text-primary" />,
              title: 'Supercharge Your Agent',
              desc: 'Your AI agent now has new capabilities. Combine skills to build powerful automated workflows.',
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="relative flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
                {icon}
              </div>
              <div className="absolute -top-2 -right-2 text-4xl font-bold text-border/30 select-none">
                {step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Creator CTA */}
      <section className="border-t border-border/40 bg-gradient-to-br from-primary/10 to-background">
        <div className="container mx-auto max-w-7xl px-4 py-16 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 mb-4">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Monetize Your AI Expertise
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Publish your custom AI skills and earn money every time someone installs
            them. Keep 80% of every sale. No setup fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard/upload">
              <Button size="lg" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Start Selling
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline">
                Browse First
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-400" /> 80% creator revenue share
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" /> Instant payouts via Stripe
            </span>
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-blue-400" /> Free to publish
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
