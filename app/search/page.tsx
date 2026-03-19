import { Suspense } from 'react'
import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, and, ilike, desc, or } from 'drizzle-orm'
import { SkillCard } from '@/components/skill-card'
import { Search } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string }
}): Promise<Metadata> {
  const q = searchParams.q?.trim()
  return {
    title: q ? `Search: ${q}` : 'Search Skills',
  }
}

async function searchSkills(query: string) {
  if (!query.trim()) return []

  const results = await db
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
      author: {
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(
      and(
        eq(skills.isPublished, true),
        eq(skills.isSuspended, false),
        or(
          ilike(skills.name, `%${query}%`),
          ilike(skills.description, `%${query}%`)
        )
      )
    )
    .orderBy(desc(skills.downloads))
    .limit(24)

  return results
}

async function SearchResults({ query }: { query: string }) {
  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold text-muted-foreground">
          Enter a search term to find skills
        </h2>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Search by name, description, or category
        </p>
      </div>
    )
  }

  const results = await searchSkills(query)

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">No results found</h2>
        <p className="text-sm text-muted-foreground mt-2">
          No skills found for &quot;{query}&quot;. Try a different search term.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        Found{' '}
        <span className="font-medium text-foreground">{results.length}</span>{' '}
        result{results.length !== 1 ? 's' : ''} for{' '}
        <span className="font-medium text-foreground">&quot;{query}&quot;</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {results.map((skill) => (
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
              username: skill.author?.username ?? 'Unknown',
              avatarUrl: skill.author?.avatarUrl,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q?.trim() ?? ''

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Search Skills</h1>

          {/* Search form */}
          <form method="GET" action="/search">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search skills by name or description..."
                autoFocus
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors text-base"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <Suspense
          key={query}
          fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
          <SearchResults query={query} />
        </Suspense>
      </div>
    </div>
  )
}
