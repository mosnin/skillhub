import { Suspense } from 'react'
import { db } from '@/lib/db'
import { skills, users, reviews } from '@/lib/db/schema'
import { eq, desc, asc, ilike, and, sql, or } from 'drizzle-orm'
import { SkillCard } from '@/components/skill-card'
import { MarketplaceFilters } from './filters'
import { Search } from 'lucide-react'

interface MarketplacePageProps {
  searchParams: {
    q?: string
    category?: string
    price?: 'free' | 'paid'
    sort?: 'popular' | 'newest' | 'price-asc' | 'price-desc'
    page?: string
  }
}

const PAGE_SIZE = 12

async function getSkills(params: MarketplacePageProps['searchParams']) {
  const { q, category, price, sort = 'popular', page = '1' } = params
  const offset = (parseInt(page) - 1) * PAGE_SIZE

  const conditions = [eq(skills.isPublished, true), eq(skills.isSuspended, false)]

  if (q) {
    conditions.push(
      or(
        ilike(skills.name, `%${q}%`),
        ilike(skills.description, `%${q}%`)
      )!
    )
  }

  if (category) {
    conditions.push(eq(skills.category, category))
  }

  if (price === 'free') {
    conditions.push(eq(skills.priceCents, 0))
  } else if (price === 'paid') {
    conditions.push(sql`${skills.priceCents} > 0`)
  }

  const orderBy =
    sort === 'newest'
      ? desc(skills.createdAt)
      : sort === 'price-asc'
      ? asc(skills.priceCents)
      : sort === 'price-desc'
      ? desc(skills.priceCents)
      : desc(skills.downloads)

  const [results, countResult] = await Promise.all([
    db
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
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(skills)
      .leftJoin(users, eq(skills.authorId, users.id))
      .where(and(...conditions)),
  ])

  return {
    skills: results,
    total: Number(countResult[0]?.count || 0),
    pages: Math.ceil(Number(countResult[0]?.count || 0) / PAGE_SIZE),
  }
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const { skills: skillList, total, pages } = await getSkills(searchParams)
  const currentPage = parseInt(searchParams.page || '1')

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-muted-foreground">
          {total.toLocaleString()} skills available
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <Suspense>
            <MarketplaceFilters searchParams={searchParams} />
          </Suspense>
        </aside>

        {/* Results */}
        <div className="flex-1">
          {skillList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {skillList.map((skill) => (
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

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <a
                      key={p}
                      href={`?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                        p === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border hover:bg-accent'
                      }`}
                    >
                      {p}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
